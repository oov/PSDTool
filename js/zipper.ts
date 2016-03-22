'use strict';

module Zipper {
   interface IDBRequestSuccessEventTarget extends EventTarget { result: Blob; }
   interface FileReaderLoadEventTarget extends EventTarget {
      error: DOMError;
      result: ArrayBuffer;
   }

   const databaseName = 'zipper';
   const fileStoreName = 'file';
   export class Zipper {
      private id = Date.now().toString() + Math.random().toString().substring(2);
      private db: IDBDatabase;
      private fileInfos: FileInfo[] = [];
      public init(success: () => void, error: (err: any) => void) {
         let req = indexedDB.open(databaseName, 1);
         req.onupgradeneeded = (e: IDBVersionChangeEvent): void => {
            let db: IDBDatabase = (<IDBOpenDBRequest>e.target).result;
            db.createObjectStore(fileStoreName);
         };
         req.onerror = (e: Event): void => {
            error(e);
         };
         req.onsuccess = (e: Event): void => {
            this.db = (<IDBOpenDBRequest>e.target).result;
            this.gc((err: any): void => undefined);
            success();
         };
      }

      public dispose(error: (err: any) => void): void {
         this.db.onerror = error;
         let tx = this.db.transaction(fileStoreName, 'readwrite');
         tx.onerror = error;
         let os = tx.objectStore(fileStoreName);
         this.remove(os, this.id, error);
         this.gc((err: any): void => undefined);
      }

      public gc(error: (err: any) => void): void {
         if (!this.db) {
            return;
         }
         this.db.onerror = error;
         let tx = this.db.transaction(fileStoreName, 'readwrite');
         tx.onerror = error;
         let os = tx.objectStore(fileStoreName);
         let req = os.openCursor(IDBKeyRange.bound(['meta', ''], ['meta', []], false, true));
         let d = new Date().getTime() - 60 * 1000;
         req.onsuccess = (e: Event): void => {
            let cur = <IDBCursorWithValue>req.result;
            if (!cur) {
               return;
            }
            if (cur.value.lastMod.getTime() < d) {
               this.remove(os, cur.key[1], error);
            }
            cur.advance(1);
         };
         req.onerror = error;
      }

      public static gc(): void {
         new Zipper().init((): void => undefined, (err: any): void => undefined);
      }

      private remove(os: IDBObjectStore, id: string, error: (err: any) => void): void {
         if (!this.db) {
            return;
         }
         let req = os.delete(IDBKeyRange.bound(['body', id, 0], ['body', id, ''], false, true));
         req.onsuccess = (e: Event): void => {
            os.delete(['meta', id]);
         };
      }

      public add(name: string, blob: Blob, complete: () => void, error: (err: any) => void): void {
         if (!this.db) {
            return;
         }
         let reqs = 2;
         this.db.onerror = error;
         let tx = this.db.transaction(fileStoreName, 'readwrite');
         tx.onerror = error;
         let os = tx.objectStore(fileStoreName);
         os.put({ lastMod: new Date() }, ['meta', this.id]);
         let req = os.put(blob, ['body', this.id, this.fileInfos.length]);
         req.onsuccess = (e: Event): void => {
            if (!--reqs) {
               complete();
            }
         };
         req.onerror = error;
         this.fileInfos.push(new FileInfo(name, blob, (): void => {
            if (!--reqs) {
               complete();
            }
         }, error));
      }

      public generate(complete: (blob: Blob) => void, error: (err: any) => void): void {
         if (!this.db) {
            throw new Error('Zipper is already disposed');
         }
         this.db.onerror = error;
         let tx = this.db.transaction(fileStoreName, 'readwrite');
         tx.onerror = error;
         let os = tx.objectStore(fileStoreName);
         os.put({ lastMod: new Date() }, ['meta', this.id]);
         this.receiveFiles((blobs: Blob[]): void => {
            complete(this.makeZIP(blobs));
         }, error);
      }

      private receiveFiles(success: (blobs: Blob[]) => void, error: (err: any) => void): void {
         let reqs = this.fileInfos.length;
         let blobs: Blob[] = new Array<Blob>(this.fileInfos.length);
         this.db.onerror = error;
         let tx = this.db.transaction(fileStoreName, 'readonly');
         tx.onerror = error;
         let os = tx.objectStore(fileStoreName);
         this.fileInfos.forEach((fi: FileInfo, i: number): void => {
            let req = os.get(['body', this.id, i]);
            req.onsuccess = (e: Event): void => {
               blobs[i] = (<IDBRequestSuccessEventTarget>e.target).result;
               if (!--reqs) {
                  success(blobs);
               }
            };
            req.onerror = error;
         });
      }

      private makeZIP(fileBodies: Blob[]): Blob {
         let zip: Blob[] = [];
         this.fileInfos.forEach((fi: FileInfo, i: number): void => {
            zip.push(fi.toLocalFileHeader(), fileBodies[i]);
         });
         let pos = 0, cdrSize = 0;
         this.fileInfos.forEach((fi: FileInfo): void => {
            zip.push(fi.toCentralDirectoryRecord(pos));
            pos += fi.fileSize + fi.localFileHeaderSize;
            cdrSize += fi.centralDirectoryRecordSize;
         });
         zip.push(Zip.buildEndOfCentralDirectory(this.fileInfos.length, cdrSize, pos));
         return new Blob(zip, { type: 'application/zip' });
      }
   }

   class FileInfo {
      public date = new Date();
      private size: number;
      private crc: number;
      private name: ArrayBuffer;
      constructor(name: string, data: Blob, complete: () => void, error: (err: any) => void) {
         this.size = data.size;
         let reqs = 2;

         let fr = new FileReader();
         fr.onload = (e: Event): void => {
            this.crc = CRC32.crc32((<FileReaderLoadEventTarget>e.target).result);
            if (!--reqs) {
               complete();
            }
         };
         fr.onerror = (e: Event): void => {
            error((<FileReaderLoadEventTarget>e.target).error);
         };
         fr.readAsArrayBuffer(data);

         let nr = new FileReader();
         nr.onload = (e: Event): void => {
            this.name = (<FileReaderLoadEventTarget>e.target).result;
            if (!--reqs) {
               complete();
            }
         };
         nr.onerror = (e: Event): void => {
            error((<FileReaderLoadEventTarget>e.target).error);
         };
         nr.readAsArrayBuffer(new Blob([name]));
      }

      get fileSize(): number {
         return this.size;
      }

      get localFileHeaderSize(): number {
         return Zip.calcLocalFileHeaderSize(this.name);
      }

      public toLocalFileHeader(): Blob {
         return Zip.buildLocalFileHeader(this.name, this.crc, this.date, this.size);
      }

      get centralDirectoryRecordSize(): number {
         return Zip.calcCentralDirectoryRecordSize(this.name);
      }

      public toCentralDirectoryRecord(lfhOffset: number): Blob {
         return Zip.buildCentralDirectoryRecord(this.name, this.crc, this.date, this.size, lfhOffset);
      }
   }

   // Reference: http://www.onicos.com/staff/iz/formats/zip.html
   class Zip {
      public static calcLocalFileHeaderSize(name: ArrayBuffer): number {
         return 30 + name.byteLength + 9 + name.byteLength;
      }

      public static buildLocalFileHeader(name: ArrayBuffer, crc: number, lastMod: Date, fileSize: number): Blob {
         let d = Zip.formatDate(lastMod);
         let lfh = new ArrayBuffer(30), extraField = new ArrayBuffer(9);
         let v = new DataView(lfh);
         // Local file header signature
         v.setUint32(0, 0x04034b50, true);
         // Version needed to extract
         v.setUint16(4, 0x000a, true);
         // General purpose bit flag
         // 0x0800 = the file name is encoded with UTF-8
         v.setUint16(6, 0x0800, true);
         // Compression method
         // 0 = stored (no compression)
         v.setUint16(8, 0x0000, true);
         // Last mod file time
         v.setUint16(10, d & 0xffff, true);
         // Last mod file date
         v.setUint16(12, (d >>> 16) & 0xffff, true);
         // CRC-32
         v.setUint32(14, crc, true);
         // Compressed size
         v.setUint32(18, fileSize, true);
         // Uncompressed size
         v.setUint32(22, fileSize, true);
         // Filename length
         v.setUint16(26, name.byteLength, true);

         // Extra field length
         // https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
         // 4.6.9 -Info-ZIP Unicode Path Extra Field (0x7075):
         // Value         Size        Description
         // -----         ----        -----------
         // 0x7075        Short       tag for this extra block type ("up")
         // TSize         Short       total data size for this block
         // Version       1 byte      version of this extra field, currently 1
         // NameCRC32     4 bytes     File Name Field CRC32 Checksum
         // UnicodeName   Variable    UTF-8 version of the entry File Name
         v.setUint16(28, extraField.byteLength + name.byteLength, true);

         v = new DataView(extraField);
         // Tag for this extra block type
         v.setUint16(0, 0x7075, true);
         // TSize
         v.setUint16(2, 5 + name.byteLength, true);
         // Version
         v.setUint8(4, 0x01);
         // NameCRC32
         v.setUint32(5, CRC32.crc32(name), true);
         return new Blob([lfh, name, extraField, name]);
      }

      public static calcCentralDirectoryRecordSize(name: ArrayBuffer): number {
         return 46 + name.byteLength + 9 + name.byteLength;
      }

      public static buildCentralDirectoryRecord(
         name: ArrayBuffer, crc: number, lastMod: Date, fileSize: number, lfhOffset: number): Blob {
         let d = Zip.formatDate(lastMod);
         let cdr = new ArrayBuffer(46), extraField = new ArrayBuffer(9);
         let v = new DataView(cdr);
         // Central file header signature
         v.setUint32(0, 0x02014b50, true);
         // Version made by
         v.setUint16(4, 0x0014, true);
         // Version needed to extract
         v.setUint16(6, 0x000a, true);
         // General purpose bit flag
         // 0x0800 = the file name is encoded with UTF-8
         v.setUint16(8, 0x0800, true);
         // Compression method
         // 0 = stored (no compression)
         v.setUint16(10, 0x0000, true);
         // Last mod file time
         v.setUint16(12, d & 0xffff, true);
         // Last mod file date
         v.setUint16(14, (d >>> 16) & 0xffff, true);
         // CRC-32
         v.setUint32(16, crc, true);
         // Compressed size
         v.setUint32(20, fileSize, true);
         // Uncompressed size
         v.setUint32(24, fileSize, true);
         // Filename length
         v.setUint16(28, name.byteLength, true);
         // Extra field length
         v.setUint16(30, extraField.byteLength + name.byteLength, true);
         // File comment length
         v.setUint16(32, 0, true);
         // Disk number start
         v.setUint16(34, 0, true);
         // Internal file attributes
         v.setUint16(36, 0, true);
         // External file attributes
         v.setUint32(38, 0, true);
         // Relative offset of local header
         v.setUint32(42, lfhOffset, true);

         v = new DataView(extraField);
         // Tag for this extra block type
         v.setUint16(0, 0x7075, true);
         // TSize
         v.setUint16(2, 5 + name.byteLength, true);
         // Version
         v.setUint8(4, 0x01);
         // NameCRC32
         v.setUint32(5, CRC32.crc32(name), true);

         return new Blob([cdr, name, extraField, name]);
      }

      private static formatDate(d: Date): number {
         if (!d) {
            d = new Date();
         }
         let date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
         let time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() / 2);
         return (date << 16) | time; // YYYYYYYm mmmddddd HHHHHMMM MMMSSSSS
      }

      public static buildEndOfCentralDirectory(files: number, cdrSize: number, cdrOffset: number): Blob {
         let eoc = new ArrayBuffer(22);
         let v = new DataView(eoc);
         // End of central dir signature
         v.setUint32(0, 0x06054b50, true);
         // Number of this disk
         v.setUint16(4, 0, true);
         // Number of the disk with the start of the central directory
         v.setUint16(6, 0, true);
         // Total number of entries in the central dir on this disk
         v.setUint16(8, files, true);
         // Total number of entries in the central dir
         v.setUint16(10, files, true);
         // Size of the central directory
         v.setUint32(12, cdrSize, true);
         // Offset of start of central directory with respect to the starting disk number
         v.setUint32(16, cdrOffset, true);
         // zipfile comment length
         v.setUint16(20, 0, true);
         return new Blob([eoc]);
      }
   }

   class CRC32 {
      // Based on http://stackoverflow.com/a/18639999
      private static makeCRCTable(): Uint32Array {
         let c: number, n: number, k: number;
         const crcTable = new Uint32Array(256);
         for (n = 0; n < 256; n++) {
            c = n;
            for (k = 0; k < 8; k++) {
               c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            crcTable[n] = c;
         }
         return crcTable;
      }
      private static crcTable = CRC32.makeCRCTable();
      public static crc32(src: ArrayBuffer): number {
         const crcTable = CRC32.crcTable;
         let u8a = new Uint8Array(src);
         let crc = 0 ^ (-1);
         for (let i = 0; i < u8a.length; i++) {
            crc = (crc >>> 8) ^ crcTable[(crc ^ u8a[i]) & 0xFF];
         }
         return (crc ^ (-1)) >>> 0;
      }
   }
}
Zipper.Zipper.gc();
