'use strict';
module Zipper {
   const databaseName = 'zipper';
   const fileStoreName = 'file';
   export class Zipper {
      private id = Date.now().toString() + Math.random().toString().substring(2);
      private db: IDBDatabase;
      private fileInfos: FileInfo[] = [];
      public init(success: () => void, error: (err: any) => void) {
         let req = indexedDB.open(databaseName, 1);
         req.onupgradeneeded = e => {
            let db: IDBDatabase = req.result;
            if (db instanceof IDBDatabase) {
               db.createObjectStore(fileStoreName);
               return;
            }
            throw new Error('req.result is not IDBDatabase');
         };
         req.onerror = e => error(e);
         req.onsuccess = e => {
            let db: IDBDatabase = req.result;
            if (db instanceof IDBDatabase) {
               this.db = db;
               this.gc((err: any): void => undefined);
               success();
               return;
            }
            throw new Error('req.result is not IDBDatabase');
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
         req.onsuccess = e => {
            let cursor: IDBCursorWithValue = req.result;
            if (!cursor) {
               return;
            }
            if (cursor instanceof IDBCursorWithValue) {
               if (cursor.value.lastMod.getTime() < d) {
                  let key = (<IDBArrayKey>cursor.key)[1];
                  if (typeof key === 'string') {
                     this.remove(os, key, error);
                  }
               }
               cursor.continue();
               return;
            }
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
         req.onsuccess = e => {
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
         req.onsuccess = e => {
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
            let size = Zip.endOfCentralDirectorySize;
            this.fileInfos.forEach((fi): void => {
               size += fi.localFileHeaderSize + fi.fileSize + fi.centralDirectoryRecordSize;
            });
            if (size > 0xffffffff || this.fileInfos.length > 0xffff) {
               complete(this.makeZIP64(blobs));
            } else {
               complete(this.makeZIP(blobs));
            }
         }, error);
      }

      private receiveFiles(success: (blobs: Blob[]) => void, error: (err: any) => void): void {
         let reqs = this.fileInfos.length;
         let blobs: Blob[] = new Array<Blob>(this.fileInfos.length);
         this.db.onerror = error;
         let tx = this.db.transaction(fileStoreName, 'readonly');
         tx.onerror = error;
         let os = tx.objectStore(fileStoreName);
         this.fileInfos.forEach((fi, i): void => {
            let req = os.get(['body', this.id, i]);
            req.onsuccess = e => {
               let result: Blob = req.result;
               if (result instanceof Blob) {
                  blobs[i] = result;
                  if (!--reqs) {
                     success(blobs);
                  }
               }
            };
            req.onerror = error;
         });
      }

      private makeZIP(fileBodies: Blob[]): Blob {
         let zip: Blob[] = [];
         this.fileInfos.forEach((fi, i): void => {
            zip.push(fi.toLocalFileHeader(), fileBodies[i]);
         });
         let pos = 0, cdrSize = 0;
         this.fileInfos.forEach((fi): void => {
            zip.push(fi.toCentralDirectoryRecord(pos));
            pos += fi.fileSize + fi.localFileHeaderSize;
            cdrSize += fi.centralDirectoryRecordSize;
         });
         zip.push(Zip.buildEndOfCentralDirectory(this.fileInfos.length, cdrSize, pos));
         return new Blob(zip, { type: 'application/zip' });
      }

      private makeZIP64(fileBodies: Blob[]): Blob {
         let zip: Blob[] = [];
         let pos = 0;
         this.fileInfos.forEach((fi, i): void => {
            zip.push(fi.toLocalFileHeader64(pos), fileBodies[i]);
            pos += fi.fileSize + fi.localFileHeaderSize64;
         });
         pos = 0;
         let cdrSize = 0;
         this.fileInfos.forEach((fi): void => {
            zip.push(fi.toCentralDirectoryRecord64(pos));
            pos += fi.fileSize + fi.localFileHeaderSize64;
            cdrSize += fi.centralDirectoryRecordSize64;
         });
         zip.push(Zip64.buildEndOfCentralDirectory(this.fileInfos.length, cdrSize, pos));
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
         fr.onload = e => {
            let result = fr.result;
            if (result instanceof ArrayBuffer) {
               this.crc = CRC32.crc32(result);
               if (!--reqs) {
                  complete();
               }
            }
         };
         fr.onerror = e => error(fr.error);
         fr.readAsArrayBuffer(data);

         let nr = new FileReader();
         nr.onload = e => {
            let result = nr.result;
            if (result instanceof ArrayBuffer) {
               this.name = result;
               if (!--reqs) {
                  complete();
               }
            }
         };
         nr.onerror = e => error(nr.error);
         nr.readAsArrayBuffer(new Blob([name]));
      }

      get fileSize(): number {
         return this.size;
      }

      get localFileHeaderSize(): number {
         return Zip.calcLocalFileHeaderSize(this.name);
      }

      get localFileHeaderSize64(): number {
         return Zip64.calcLocalFileHeaderSize(this.name);
      }

      public toLocalFileHeader(): Blob {
         return Zip.buildLocalFileHeader(this.name, this.crc, this.date, this.size);
      }

      public toLocalFileHeader64(lfhOffset: number): Blob {
         return Zip64.buildLocalFileHeader(this.name, this.crc, this.date, this.size, lfhOffset);
      }

      get centralDirectoryRecordSize(): number {
         return Zip.calcCentralDirectoryRecordSize(this.name);
      }

      get centralDirectoryRecordSize64(): number {
         return Zip64.calcCentralDirectoryRecordSize(this.name);
      }

      public toCentralDirectoryRecord(lfhOffset: number): Blob {
         return Zip.buildCentralDirectoryRecord(this.name, this.crc, this.date, this.size, lfhOffset);
      }

      public toCentralDirectoryRecord64(lfhOffset: number): Blob {
         return Zip64.buildCentralDirectoryRecord(this.name, this.crc, this.date, this.size, lfhOffset);
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

      static get endOfCentralDirectorySize(): number {
         return 22;
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

   class Zip64 {
      public static calcLocalFileHeaderSize(name: ArrayBuffer): number {
         return 30 + name.byteLength + 32 + 9 + name.byteLength;
      }

      public static buildLocalFileHeader(name: ArrayBuffer, crc: number, lastMod: Date, fileSize: number, lfhOffset: number): Blob {
         let d = Zip64.formatDate(lastMod);
         let lfh = new ArrayBuffer(30), extraFieldZip64 = new ArrayBuffer(32), extraFieldName = new ArrayBuffer(9);
         let v = new DataView(lfh);
         // Local file header signature
         v.setUint32(0, 0x04034b50, true);
         // Version needed to extract
         v.setUint16(4, 0x002d, true);
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
         v.setUint32(18, 0xffffffff, true);
         // Uncompressed size
         v.setUint32(22, 0xffffffff, true);
         // Filename length
         v.setUint16(26, name.byteLength, true);

         // Extra field length
         // https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
         v.setUint16(28, extraFieldZip64.byteLength + extraFieldName.byteLength + name.byteLength, true);

         // 4.5.3 -Zip64 Extended Information Extra Field (0x0001):
         // Value      Size       Description
         // -----      ----       -----------
         // 0x0001     2 bytes    Tag for this "extra" block type
         // Size       2 bytes    Size of this "extra" block
         // Original
         // Size       8 bytes    Original uncompressed file size
         // Compressed
         // Size       8 bytes    Size of compressed data
         // Relative Header
         // Offset     8 bytes    Offset of local header record
         // Disk Start
         // Number     4 bytes    Number of the disk on which
         //                       this file starts
         v = new DataView(extraFieldZip64);
         // Tag for this extra block type
         v.setUint16(0, 0x0001, true);
         // Size
         v.setUint16(2, 28, true);
         // Original Size
         Zip64.setUint64(v, 4, fileSize);
         // Compressed Size
         Zip64.setUint64(v, 12, fileSize);
         // Relative Header Offset
         Zip64.setUint64(v, 20, lfhOffset);
         // Disk Start Number
         v.setUint32(28, 0);

         // 4.6.9 -Info-ZIP Unicode Path Extra Field (0x7075):
         // Value         Size        Description
         // -----         ----        -----------
         // 0x7075        Short       tag for this extra block type ("up")
         // TSize         Short       total data size for this block
         // Version       1 byte      version of this extra field, currently 1
         // NameCRC32     4 bytes     File Name Field CRC32 Checksum
         // UnicodeName   Variable    UTF-8 version of the entry File Name

         v = new DataView(extraFieldName);
         // Tag for this extra block type
         v.setUint16(0, 0x7075, true);
         // TSize
         v.setUint16(2, 5 + name.byteLength, true);
         // Version
         v.setUint8(4, 0x01);
         // NameCRC32
         v.setUint32(5, CRC32.crc32(name), true);
         return new Blob([lfh, name, extraFieldZip64, extraFieldName, name]);
      }

      public static calcCentralDirectoryRecordSize(name: ArrayBuffer): number {
         return 46 + name.byteLength + 32 + 9 + name.byteLength;
      }

      public static buildCentralDirectoryRecord(
         name: ArrayBuffer, crc: number, lastMod: Date, fileSize: number, lfhOffset: number): Blob {
         let d = Zip64.formatDate(lastMod);
         let cdr = new ArrayBuffer(46), extraFieldZip64 = new ArrayBuffer(32), extraFieldName = new ArrayBuffer(9);
         let v = new DataView(cdr);
         // Central file header signature
         v.setUint32(0, 0x02014b50, true);
         // Version made by
         v.setUint16(4, 0x002d, true);
         // Version needed to extract
         v.setUint16(6, 0x002d, true);
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
         v.setUint32(20, 0xffffffff, true);
         // Uncompressed size
         v.setUint32(24, 0xffffffff, true);
         // Filename length
         v.setUint16(28, name.byteLength, true);
         // Extra field length
         v.setUint16(30, extraFieldZip64.byteLength + extraFieldName.byteLength + name.byteLength, true);
         // File comment length
         v.setUint16(32, 0, true);
         // Disk number start
         v.setUint16(34, 0xffff, true);
         // Internal file attributes
         v.setUint16(36, 0, true);
         // External file attributes
         v.setUint32(38, 0, true);
         // Relative offset of local header
         v.setUint32(42, 0xffffffff, true);

         v = new DataView(extraFieldZip64);
         // Tag for this extra block type
         v.setUint16(0, 0x0001, true);
         // Size
         v.setUint16(2, 28, true);
         // Original Size
         Zip64.setUint64(v, 4, fileSize);
         // Compressed Size
         Zip64.setUint64(v, 12, fileSize);
         // Relative Header Offset
         Zip64.setUint64(v, 20, lfhOffset);
         // Disk Start Number
         v.setUint32(28, 0);

         v = new DataView(extraFieldName);
         // Tag for this extra block type
         v.setUint16(0, 0x7075, true);
         // TSize
         v.setUint16(2, 5 + name.byteLength, true);
         // Version
         v.setUint8(4, 0x01);
         // NameCRC32
         v.setUint32(5, CRC32.crc32(name), true);

         return new Blob([cdr, name, extraFieldZip64, extraFieldName, name]);
      }

      private static formatDate(d: Date): number {
         if (!d) {
            d = new Date();
         }
         let date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
         let time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() / 2);
         return (date << 16) | time; // YYYYYYYm mmmddddd HHHHHMMM MMMSSSSS
      }

      static get endOfCentralDirectorySize(): number {
         return 22 + 56 + 20;
      }

      public static buildEndOfCentralDirectory(files: number, cdrSize: number, cdrOffset: number): Blob {
         let eoc = new ArrayBuffer(22), eoc64 = new ArrayBuffer(56), eocl64 = new ArrayBuffer(20);
         let v = new DataView(eoc64);
         // zip64 end of central dir signature
         v.setUint32(0, 0x06064b50, true);
         // size of zip64 end of central directory record
         Zip64.setUint64(v, 4, eoc64.byteLength + eocl64.byteLength + eoc.byteLength - 12);
         // version made by
         v.setUint16(12, 0x002d, true);
         // version needed to extract
         v.setUint16(14, 0x002d, true);
         // number of this disk
         v.setUint32(16, 0, true);
         // number of the disk with the start of the central directory
         v.setUint32(20, 0, true);
         // total number of entries in the central directory on this disk
         Zip64.setUint64(v, 24, files);
         // total number of entries in the central directory
         Zip64.setUint64(v, 32, files);
         // size of the central directory
         Zip64.setUint64(v, 40, cdrSize);
         // offset of start of central directory with respect to the starting disk number
         Zip64.setUint64(v, 48, cdrOffset);

         v = new DataView(eocl64);
         // zip64 end of central dir locator signature
         v.setUint32(0, 0x07064b50, true);
         // number of the disk with the start of the zip64 end of central directory
         v.setUint32(4, 0, true);
         // relative offset of the zip64 end of central directory record
         Zip64.setUint64(v, 8, cdrOffset + cdrSize);
         // total number of disks
         v.setUint32(16, 1, true);

         v = new DataView(eoc);
         // End of central dir signature
         v.setUint32(0, 0x06054b50, true);
         // Number of this disk
         v.setUint16(4, 0xffff, true);
         // Number of the disk with the start of the central directory
         v.setUint16(6, 0xffff, true);
         // Total number of entries in the central dir on this disk
         v.setUint16(8, 0xffff, true);
         // Total number of entries in the central dir
         v.setUint16(10, 0xffff, true);
         // Size of the central directory
         v.setUint32(12, 0xffffffff, true);
         // Offset of start of central directory with respect to the starting disk number
         v.setUint32(16, 0xffffffff, true);
         // zipfile comment length
         v.setUint16(20, 0, true);
         return new Blob([eoc64, eocl64, eoc]);
      }

      private static setUint64(v: DataView, offset: number, value: number): void {
         v.setUint32(offset, value & 0xffffffff, true);
         v.setUint32(offset + 4, Math.floor(value / 0x100000000), true);
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
