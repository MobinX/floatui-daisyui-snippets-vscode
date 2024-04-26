
require('dotenv').config();
console.log(process.env)

//a function to fetch and json


async function editAndCommitFiles(owner, repo, branch, accessToken, files, commitMessage) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;

    // Get the SHA of the current tree
    const getTreeShaResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/json'
        }
    });

    if (!getTreeShaResponse.ok) {
        throw new Error(`Failed to get tree SHA: ${getTreeShaResponse.statusText}`);
    }

    const treeShaData = await getTreeShaResponse.json();
    const treeSha = treeShaData.object.sha;

    // Update file contents
    const updatedFiles = await Promise.all(files.map(async file => {
        const getFileResponse = await fetch(`${apiUrl}/${file.path}?ref=${branch}`, {
            headers: {
                Authorization: `token ${accessToken}`,
                Accept: 'application/json'
            }
        });

        if (!getFileResponse.ok) {
            throw new Error(`Failed to get file content: ${getFileResponse.statusText}`);
        }

        const fileData = await getFileResponse.json();
        const updatedContent = Buffer.from(file.content).toString('base64');

        return {
            ...file,
            sha: fileData.sha,
            content: updatedContent
        };
    }));

    // Create blobs for updated files
    const createBlob = async (content) => {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
            method: 'POST',
            headers: {
                Authorization: `token ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                encoding: 'base64'
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to create blob: ${response.statusText}`);
        }

        const responseData = await response.json();
        return responseData.sha;
    };

    const updatedBlobShas = await Promise.all(updatedFiles.map(async file => {
        return await createBlob(file.content);
    }));

    // Create tree with updated file blobs
    const tree = updatedFiles.map((file, index) => {
        console.log(file.path, updatedBlobShas[index]);
        return {
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: updatedBlobShas[index]
        }
    });

    const createTreeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            base_tree: treeSha,
            tree: tree
        })
    });

    if (!createTreeResponse.ok) {
        throw new Error(`Failed to create tree: ${createTreeResponse.statusText}`);
    }

    const createTreeData = await createTreeResponse.json();
    const newTreeSha = createTreeData.sha;

    // Create commit
    const createCommitResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: commitMessage,
            tree: newTreeSha,
            parents: [treeSha]
        })
    });

    if (!createCommitResponse.ok) {
        throw new Error(`Failed to create commit: ${createCommitResponse.statusText}`);
    }

    const createCommitData = await createCommitResponse.json();
    const newCommitSha = createCommitData.sha;

    // Update reference (branch)
    const updateRefResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sha: newCommitSha,
            force: true
        })
    });

    if (!updateRefResponse.ok) {
        throw new Error(`Failed to update reference: ${updateRefResponse.statusText}`);
    }

    console.log('Files edited and committed successfully!');
}

async function fetchJSON(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching JSON:', error);
        throw error;
    }
}

// Example usage:
const owner = 'MobinX';
const repo = 'floatui-daisyui-snippets-vscode';
const branch = 'master';
const accessToken = process.env.GITHUB_TOKEN
console.log(accessToken);
const commitMessage = 'Update files';
let content1, content2;

fetchJSON("https://raw.githubusercontent.com/MobinX/tailwind-ui-snippets/master/snippets/snippets-jsx.json")
    .then(data => { 
    content1 = data;
    fetchJSON("https://raw.githubusercontent.com/MobinX/tailwind-ui-snippets/master/snippets/snippets-html.json")
    .then(data1 => { 
    content2 = data1;

    const files = [
        {
            path: 'snippets/snippets-jsx.json',
            content: JSON.stringify(content1)
        },
        {
            path: 'snippets/snippets-html.json',
            content: JSON.stringify(content2),
        },
        {
            path: 'package.json',
            content: `{
                "name": "floatui-daisyui-snippets-vscode",
                "displayName": "FloatUI with DaisyUI themed and component snippets for React and Html",
                "description": "JSX and HTML Snippets for FloatUI equipped with DaisyUI components and theme for faster development",
                "icon": "icons/logo.png",
                "publisher": "MobinX",
                "private": true,
                "scripts": {
                  "deploy": "vsce publish --yarn"
                },
                "repository": {
                  "type": "git",
                  "url": "https://github.com/MobinX/floatui-daisyui-snippets-vscode.git"
                },
                "version": "1.0.4",
                "release": {
                  "branches": "master",
                  "verifyConditions": [
                    "@semantic-release/github"
                  ],
                  "publish": [
                    "@semantic-release/github"
                  ],
                  "success": [
                    "@semantic-release/github"
                  ],
                  "fail": [
                    "@semantic-release/github"
                  ]
                },
                "engines": {
                  "vscode": "^1.88.0"
                },
                "categories": [
                  "Snippets"
                ],
                "contributes": {
                  "snippets": [
                    {
                      "language": "html",
                      "path": "./snippets/snippets-html.json"
                    },
                    {
                      "language": "javascript",
                      "path": "./snippets/snippets-jsx.json"
                    },
                    {
                      "language": "javascriptreact",
                      "path": "./snippets/snippets-jsx.json"
                    },
                    {
                      "language": "typescript",
                      "path": "./snippets/snippets-jsx.json"
                    },
                    {
                      "language": "typescriptreact",
                      "path": "./snippets/snippets-jsx.json"
                    }
                  ]
                },
                "devDependencies": {
                  "@vscode/vsce": "^2.26.0",
                  "semantic-release": "^23.0.8"
                },
                "dependencies": {
                  "node-fetch": "^3.3.2"
                }
              }
              `
        }
    ];
    
    editAndCommitFiles(owner, repo, branch, accessToken, files, commitMessage)
        .catch(error => console.error(error));
    



})
    .catch(error => console.error('Error:', error));




})
    .catch(error => console.error('Error:', error));





