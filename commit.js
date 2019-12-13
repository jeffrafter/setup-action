"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commit = async (octokit, params) => {
    const { owner, repo, files, baseRef, headRef } = params;
    // Grab the ref for a branch
    const refResponse = await octokit.git.getRef({
        owner,
        repo,
        ref: baseRef,
    });
    const sha = refResponse.data.object.sha;
    console.log({ sha });
    // Grab the current tree so we can see the list of paths
    // https://developer.github.com/v3/git/trees/#get-a-tree-recursively
    const baseTreeResponse = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: sha,
    });
    const paths = baseTreeResponse.data.tree.map((item) => {
        return item.path;
    });
    console.log({ paths });
    // Keep track of the entries for this commit
    const tree = [];
    for (let i = 0; i < files.length; i++) {
        const { path, content, mode } = files[i];
        // If you have a large amount of data to commit it is sometimes
        // better to create a sha for each file individually. You can then
        // use the created blob shas to construct the tree. You _must_ do
        // this when the content is non-text
        // https://github.com/octokit/rest.js/issues/1313#issuecomment-531911534
        const blobResponse = await octokit.git.createBlob({
            owner,
            repo,
            encoding: 'base64',
            content,
        });
        const blobSha = blobResponse.data.sha;
        // Add the sha of each blob as a tree entry. We can't use the contents directly
        // for each tree entry because the files may be binary
        tree.push({
            path,
            mode,
            type: 'blob',
            sha: blobSha,
        });
    }
    // Create the tree using the collected tree entries
    // https://developer.github.com/v3/git/trees/#create-a-tree
    const treeResponse = await octokit.git.createTree({
        owner,
        repo,
        base_tree: sha,
        tree: tree,
    });
    console.log({ treeResponse: treeResponse.data });
    // Commit that tree
    // https://developer.github.com/v3/git/commits/#create-a-commit
    const message = `Starter template setup`;
    const commitResponse = await octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: treeResponse.data.sha,
        parents: [sha],
    });
    console.log(`Commit complete: ${commitResponse.data.sha}`);
    // The commit is complete but it is unreachable
    // We have to create a ref (branch) for the create master to point to it
    // https://developer.github.com/v3/git/refs/#create-a-reference
    const createRefResponse = await octokit.git.createRef({
        owner,
        repo,
        ref: headRef,
        sha: commitResponse.data.sha,
    });
    console.log({ createRefResponse: createRefResponse.data });
    return createRefResponse.data;
};
exports.default = commit;
