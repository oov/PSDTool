//go:generate uglifyjs 3rd/FileSaver.min.js 3rd/split-pane/split-pane.min.js 3rd/jstree/jstree.min.js 3rd/mousetrap/mousetrap.min.js 3rd/mousetrap/mousetrap-pause.js -o 3rd.min.js
//go:generate cleancss -o ../css/3rd.min.css 3rd/split-pane/split-pane.css 3rd/jstree/style.min.css

package main
