var request = require('superagent')
var url = require('url')
var parser = require('text-metadata-parser')
var urlEncode = require('urlencode')

module.exports = function NoddityRetrieval(root) {
	function lookup(file, transform, cb) {
		if (typeof file !== 'string') {
			process.nextTick(function () {
				cb(new TypeError('Parameter \'file\' must be a string, not ' + typeof file))
			})
		} else {
			var parsedUrl = url.parse(url.resolve(root, file))
			var escapedPathname = parsedUrl.pathname.split('/').map(function (url) {
				// First decode, in case you have %20 or similar already in the URL
				// Then encode, in case you have unicode characters
				return urlEncode(urlEncode.decode(url))
			}).join('/')
			parsedUrl.pathname = escapedPathname
			var fullUrl = url.format(parsedUrl)

			request.get(fullUrl).end(function (err, res) {
				if (err) {
					cb(new Error("Lookup of " + fullUrl + " failed\n========\n" + err.message))
				} else if (res.status !== 200) {
					cb(new Error("Lookup of " + fullUrl + " returned status " + res.status + "\n==========\n" + res.text))
				} else {
					var result
					try {
						result = [ null, transform(res.text) ]
					} catch (e) {
						result = [ e ]
					}
					cb.apply(null, result)
				}
			})
		}
	}

	return {
		getIndex: function(cb) {
			lookup('index.json', JSON.parse, cb)
		},
		getPost: function(filename, cb) {
			lookup(filename, function (textToParse) {
				var post = parser(textToParse, {
					date: 'date',
					boolean: 'markdown'
				})
				post.filename = filename
				return post
			}, cb)
		}
	}
}
