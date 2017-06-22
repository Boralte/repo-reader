const { dialog } = require('electron').remote
const { shell } = require('electron')
const exec = require('child_process').exec
const request = require('request')
const process = require('process')
const async = require('async')
const fs = require('fs')
const path = require('path')
var $ = window.$ = require('jquery')

$(document).on('click', 'a[href^="http"]', function (event) {
  event.preventDefault()
  shell.openExternal(this.href)
})

const githubToken = process.env && process.env.GITHUB_TOKEN

console.log(githubToken)

$(() => {
  $('#pickRepo').click(function () {
    dialog.showOpenDialog({properties: ['openDirectory']}, (dir) => {
      displayRepos(dir[0])
    })
  })
})

function formatBytes (bytes) {
  if (bytes < 1024) return bytes + ' bytes'
  else if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB'
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(0) + ' MB'
  else return (bytes / 1073741824).toFixed(0) + ' GB'
};

function isDirectory (filePath, callback) {
  fs.stat(filePath, (err, xFile) => {
    if (!err && xFile.isDirectory()) {
      callback(null, true)
    } else {
      callback(new Error('Not a directory'), false)
    }
  })
}

function isRepo (filePath, callback) {
  exec(`cd "${filePath}" && git status`, (error, stdout, stderr) => {
    if (error) {
      console.error(filePath, `exec error: ${error}`)
      callback(new Error('Not a directory'), false)
    } else {
      callback(null, true)
    }
  })
}

function readSize (item, cb) {
  fs.lstat(item, function (err, stats) {
    if (!err && stats.isDirectory()) {
      var total = stats.size
      fs.readdir(item, function (err, list) {
        if (err) return cb(err)
        async.forEach(
          list,
          function (diritem, callback) {
            readSize(path.join(item, diritem), function (err, size) {
              total += size
              callback(err)
            })
          },
          function (err) {
            cb(err, total)
          }
        )
      })
    } else {
      cb(err)
    }
  })
}
function fetchRepoData (shortUrl) {
  return new Promise((resolve, reject) => {
    var options = {
      url: `https://api.github.com/repos/${shortUrl}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 5 Build/LMY48B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.65 Mobile Safari/537.36',
        'Authorization': `token ${githubToken}`
      }
    }
    request(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        var data = JSON.parse(body)
        console.log(body)
      } else {
        console.log('GitHub status: ' + response.statusCode)
      }
      return resolve(data)
    })
  })
}

function displayRepos (dir) {
  const cList = $('#repoList')
  cList.empty()
  fs.readdir(dir, (err, files) => {
    if (err) return
    $.each(files, (i, file) => {
      const filePath = path.join(dir, file)
      isDirectory(filePath, (err, result) => {
        if (err && !result) return
        isRepo(filePath, (err, result) => {
          if (err) console.log('Is not Repp: ' + err)
          var consoleResult
          var shortUrl
          exec(`cd ${filePath} && git config --get remote.origin.url`, (error, stdout, stderr) => {
            if (error) {
              console.error(`exec error: ${error}`)
              consoleResult = 'https://github.com/404'
              shortUrl = 'https://github.com/404'
            } else {
              consoleResult = stdout
              shortUrl = consoleResult.replace(/.*(github.com\/)/, '').replace('.git', '')
            }
            fetchRepoData(shortUrl).then((repoData) => {
              var description = repoData && repoData.description ? repoData.description : 'No description available'
              var issueCount = repoData && repoData.open_issues ? repoData.open_issues : 'n/a'
              var issuesUrl = repoData && repoData.html_url ? `${repoData.html_url}/issues` : consoleResult
              var language = repoData && repoData.language ? repoData.language : 'unknown'
              var homeLink = repoData && repoData.homepage ? repoData.homepage : consoleResult
              var stars = repoData && repoData.stargazers_count ? repoData.stargazers_count : 'n/a'
              var starLink = repoData && repoData.html_url ? `${repoData.html_url}/stargazers` : consoleResult
              var watchers = repoData && repoData.watchers_count ? repoData.watchers_count : 'n/a'
              var watcherLink = repoData && repoData.html_url ? `${repoData.html_url}/watchers` : consoleResult
              var size = repoData && repoData.size ? formatBytes(repoData.size) : '0 MB'

              if (consoleResult !== 'https://github.com/404' && issueCount === 'n/a') issueCount = '0'
              // readSize(filePath, (err, callback) => {
              //   size = !err && callback ? formatBytes(callback) : 'n/a MB'
              //   if (err) console.log('Size Error =========== ' + err)
              //   console.log(size)

              // exec(`cd ${filePath} && du -sh`, (error, stdout, stderr) => {
                // if (!error && stdout) {
                  // size = stdout
                // } else if (error) {
                  // console.log('Size finding error:' + error)
                // }
              var issueStatus = null

              displayReadme(filePath, (err, result) => {
                var readmeStatus = !err && result ? 'green' : 'red'
                var readmeUrl = repoData && repoData.html_url && result ? `${repoData.html_url}/blob/master/README.md` : consoleResult
                if (issueCount > 50) {
                  issueStatus = 'red'
                } else if (issueCount > 10) {
                  issueStatus = 'orange'
                } else if (issueCount <= 10) {
                  issueStatus = 'green'
                } else {
                  issueStatus = 'gray'
                }


                var li = $('<div/>')
                  .addClass(`repo-item ${issueStatus}`)
                  .attr('role', 'menuitem')
                  .prependTo(cList)

                $('<a/>')
                  .addClass('header')
                  .text(`${file}`)
                  .prop('href', homeLink)
                  .appendTo(li)

                if (consoleResult !== 'https://github.com/404') {
                  $('<a/>')
                    .addClass('link')
                    .html(`<i class="fa fa-github-square" aria-hidden="true"></i>`)
                    .prop('href', consoleResult)
                    .appendTo(li)
                }

                $('<a/>')
                  .addClass(`badge ${readmeStatus}`)
                  .html(`<i class="fa fa-file-text" aria-hidden="true"></i> readme`)
                  .prop('href', readmeUrl)
                  .appendTo(li)

                $('<a/>')
                  .addClass(`badge ${issueStatus}`)
                  .html(`<i class="fa fa-bug" aria-hidden="true"></i> ${issueCount} issues`)
                  .prop('href', issuesUrl)
                  .appendTo(li)

                $('<div/>')
                  .addClass('badge')
                  .text(language)
                  .appendTo(li)

                $('<a/>')
                  .addClass('badge star')
                  .html(`<i class="fa fa-star" aria-hidden="true"></i> ${stars}`)
                  .prop('href', starLink)
                  .appendTo(li)

                $('<a/>')
                  .addClass('badge watch')
                  .html(`<i class="fa fa-eye" aria-hidden="true"></i> ${watchers}`)
                  .prop('href', watcherLink)
                  .appendTo(li)

                $('<div/>')
                  .addClass('badge size')
                  .text(size)
                  .appendTo(li)

                $('<p/>')
                  .text(description)
                  .appendTo(li)
              })
            })
          })
        })
      })
    })
  })
}

function isReadme (files) {
  const readme = ['readme', 'ReadMe', 'Readme', 'README.md']
  let readmeFile = null
  $.each(files, (i, file) => {
    if (readme.includes(file)) readmeFile = file
  })
  return readmeFile
}

function displayReadme (dir, callback) {
  fs.readdir(dir, (err, files) => {
    if (!err && isReadme(files) != null) {
      callback(null, true)
    } else {
      callback(new Error('No readme found'), false)
    }
  })
}
