"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob = __importStar(require("glob"));
const commit_1 = __importDefault(require("./commit"));
const run = async () => {
    try {
        // Check the payload
        const push = github.context.payload.push;
        if (!push)
            return;
        const token = process.env['SETUP_USER_TOKEN'] || process.env['GITHUB_TOKEN'];
        if (!token)
            return;
        // Create the octokit client
        const octokit = new github.GitHub(token);
        const nwo = process.env['GITHUB_REPOSITORY'] || '/';
        const [owner, repo] = nwo.split('/');
        const workspace = process.env['GITHUB_WORKSPACE'] || './';
        const pullRequestBranchName = core.getInput('pull-request-branch-name');
        // If the ref already exists, noop
        try {
            const refResponse = await octokit.git.getRef({
                owner,
                repo,
                ref: `heads/${pullRequestBranchName}`,
            });
            if (refResponse.status === 200) {
                console.log('Setup branch already exists');
                return;
            }
        }
        catch (HttpError) {
            // noop
        }
        // Load the commit files
        const pullRequestFilesPath = path.join(workspace, core.getInput('pull-request-files'));
        const pullRequestFiles = glob.sync(`${pullRequestFilesPath}**/*`, { nodir: true });
        const files = [];
        pullRequestFiles.forEach((path) => {
            const relativePath = path.replace(pullRequestFilesPath, '');
            const content = fs.readFileSync(path).toString('base64');
            const mode = '100644'; // TODO
            files.push({
                path: relativePath,
                content,
                mode,
            });
        });
        // Create a commit on a new ref
        const createRefResponse = await commit_1.default(octokit, {
            owner,
            repo,
            files,
            baseRef: 'heads/master',
            headRef: `refs/heads/${pullRequestBranchName}`,
        });
        console.log({ createRefResponse });
        // Create a pull request
        const title = core.getInput('pull-request-title');
        const pullRequestTemplate = path.join(workspace, core.getInput('pull-request-template'));
        const pullRequestTemplateBuffer = fs.readFileSync(pullRequestTemplate);
        const body = pullRequestTemplateBuffer.toString('utf8');
        const pullResponse = await octokit.pulls.create({
            mediaType: {
                previews: ['shadow-cat'],
            },
            owner,
            repo,
            title,
            body,
            head: pullRequestBranchName,
            base: 'master',
            draft: true,
        });
        console.log({ pullResponse });
    }
    catch (error) {
        console.error(error.message);
        core.setFailed(`Setup-action failure: ${error}`);
    }
};
run();
exports.default = run;
