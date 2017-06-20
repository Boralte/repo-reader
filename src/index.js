const remote = require('electron').remote;
const exec = require('child_process').exec;
const request = require('request');
const process = require('process')

const app = remote.app
const dialog = remote.dialog

const fs = require('fs')
const path = require('path')
window.$ = require('jquery')

const githubToken = process.env && process.env.GITHUB_TOKEN


console.log(githubToken)

$(() => {
    $('#pickRepo').click(function () {
        dialog.showOpenDialog({properties: ['openDirectory']}, (dir) => {
            displayRepos(dir[0])
        })
    })
})

function isDir(dir, file){
    const fileDir = dir + '/' + file
    console.log(fileDir)
    return new Promise((resolve, reject) => {
            fs.stat(fileDir, (err, xFile) => {
            if (xFile.isDirectory()){ 
                console.log('true')
                return resolve() 
            } else {
                return reject(new Error('Not a directory'))
            }
        })
    })
}

function isDirectory(dir, file, callback) {
    const fileDir = dir + '/' + file
    console.log(fileDir)
    fs.stat(fileDir, (err, xFile) => {
        if (xFile.isDirectory()){ 
            console.log('true')
            callback(true)
        } else {
            callback(false)
        }
    })

}

function displayRepos(dir){
    
    const cList = $('#repoList')
    cList.empty()
    fs.readdir(dir, (err, files) => {
        $.each(files, (i, file) => {

            isDirectory(dir, file, (result) => {
                if(!result) return;
                console.log('Adding to list')
                var consoleResult
                exec(`cd ${dir}/${file} && git config --get remote.origin.url`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`exec error: ${error}`)
                        return
                    }
                    consoleResult = stdout
                    console.log(`stdout: ${stdout}`)
                    console.log(`stderr: ${stderr}`)

                    // var shortUrl = consoleResult.split('github.com/')[1]
                    // shortUrl = shortUrl.split('.git')[0]

                    var shortUrl = consoleResult.replace(/.*(github.com\/)/,'').replace('.git','')


                    console.log(shortUrl)

                    fetchRepoData(shortUrl).then((repoData) => {

                        if (repoData && repoData.description) {
                            var description = `Description: ${repoData.description}`
                        } else {
                            var description = 'No description available' 
                        }

                        var status;

                        var repoDir = path.join(dir, file)

                        displayReadme(repoDir, (result) => {
                            status = result ? 'has-readme' : 'no-readme'
                            var li = $('<div/>')
                                .addClass('readme-item')
                                .attr('role', 'menuitem')
                                .prependTo(cList);

                            var header = $('<h2/>')
                                .text(`${file}`) 
                                .appendTo(li);

                            var statusIcon = $('<span/>')
                                .addClass(`status ${status}`)
                                .prependTo(header);

                            var aaa = $('<a/>')
                                .text(`Link: ${consoleResult}`) 
                                .appendTo(li);
                            var describe = $('<p/>')
                                .text(description)
                                .appendTo(li);
                        })
                    })
                        
                })
            })

            // isDir(dir, file).then(()=> {
            //     console.log('Adding to list')
            //     var li = $('<li/>')
            //         .addClass('ui-menu-item')
            //         .attr('role', 'menuitem')
            //         .prependTo(cList);
            //     var aaa = $('<a/>')
            //         .addClass('ui-all')
            //         .text(`Name: ${file}`) 
            //         .appendTo(li);
            //     displayReadme(file)
            // }).catch((err) => {
            //     console.log(err)
            // })
        })
    })
}   

function isReadme(files){
    const readme = ['readme', 'ReadMe', 'Readme', 'README.md' ]
    let readmeFile = null
    $.each(files, (i, file) => {
        console.log(file, readme.includes(file))
        if(readme.includes(file)) readmeFile = file
    })
    return readmeFile
}

function displayReadme(dir, callback){
    
    fs.readdir(dir, (err, files) => {
        if (isReadme(files) != null) {
            //addButton('button', dir + '/' + file)
            callback(true);
        }else{
            callback(false);
        }
    })
}




// function addButton(type, filePath){
//     var button = document.createElement('button')
//     button.type = type
//     button.value = 'Readme'
//     button.name = 'Readme'
//     button.text = 'Display Readme'
//     button.onclick = function(){
//         console.log(filePath)
//     }
//     var foo = document.getElementById("fooBar");
//     foo.appendChild(button);
// }

function fetchRepoData (shortUrl) {
    return new Promise((resolve, reject) => {
        var data = null
        var options = {
            url: `https://api.github.com/repos/${shortUrl}`,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 5 Build/LMY48B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.65 Mobile Safari/537.36',
                'Authorization': `token ${githubToken}`
            }
        }
        request(options, (error, response, body) => {

            if (!error && response.statusCode == 200){
                var data = JSON.parse(body)

                console.log(body)
                console.log(data.description)
                console.log(data.open_issues)
            }
            else {
                console.log('GitHub status: ' + response.statusCode)
            }
            return resolve(data)
        })
    })
}

