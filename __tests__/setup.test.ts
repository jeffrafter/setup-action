import * as github from '@actions/github'
import {WebhookPayload} from '@actions/github/lib/interfaces'
import nock from 'nock'
import run from '../setup'

beforeEach(() => {
  jest.resetModules()

  process.env['INPUT_PULL-REQUEST-TITLE'] = 'Asssignment'
  process.env['INPUT_PULL-REQUEST-TEMPLATE'] = '.github/template/PULL_REQUEST.md'
  process.env['INPUT_PULL-REQUEST-FILES'] = '.github/template/files/'
  process.env['INPUT_PULL-REQUEST-BRANCH-NAME'] = 'assignment'
  process.env['GITHUB_REPOSITORY'] = 'example/repository'
  process.env['GITHUB_TOKEN'] = '12345'

  github.context.payload = {
    push: {
      forced: false,
      pusher: {
        name: 'Mona',
        email: '21031067+Mona@users.noreply.github.com',
      },
    },
  } as WebhookPayload
})

describe('template starter setup action', () => {
  it('runs', async () => {
    const sha = 'abc000'

    // check for empty ref, return missing
    nock('https://api.github.com')
      .get('/repos/example/repository/git/refs/heads/assignment')
      .reply(404)

    // get ref
    nock('https://api.github.com')
      .get('/repos/example/repository/git/refs/heads/master')
      .reply(200, {
        object: {
          sha: sha,
        },
      })

    // get the tree
    nock('https://api.github.com')
      .get(`/repos/example/repository/git/trees/${sha}`)
      .reply(200, {
        tree: [
          {path: '.github'},
          {path: '.github/setup/PULL_REQUEST.md'},
          {path: '.github/setup/files/add.js'},
          {path: 'add.js'},
          {path: 'add.test.js'},
          {path: 'jest.config.json'},
          {path: 'package.json'},
          {path: 'package-lock.json'},
          {path: 'README.md'},
        ],
      })

    // post the blob for add.js
    const blobSha = 'abc123'
    nock('https://api.github.com')
      .post(`/repos/example/repository/git/blobs`, body => {
        return (
          body.encoding == 'base64' &&
          body.content ==
            'bW9kdWxlLmV4cG9ydHMgPSAobGVmdCwgcmlnaHQpID0+IHsKICAvLyBXcml0ZSBhIGZ1bmN0aW9uIHRoYXQgYWRkcyB0aGUgbGVmdCBudW1iZXIgdG8gdGhlIHJpZ2h0IG51bWJlcgogIC8vIGFuZCByZXR1cm5zIGl0LiBJZiBlaXRoZXIgb2YgdGhlIGlucHV0cyBhcmUgbm90IHZhbGlkIG51bWJlcnMKICAvLyB0aHJvdyBhbiBFcnJvcgp9'
        )
      })
      .reply(200, {
        sha: blobSha,
      })

    // post the tree
    const treeSha = 'abc456'
    nock('https://api.github.com')
      .post(`/repos/example/repository/git/trees`, body => {
        return (
          body.base_tree === sha &&
          body.tree[0].path === 'add.js' &&
          body.tree[0].mode === '100644' &&
          body.tree[0].type === 'blob' &&
          body.tree[0].sha === blobSha
        )
      })
      .reply(200, {
        sha: treeSha,
      })

    // create commit
    const commitSha = 'abc789'
    nock('https://api.github.com')
      .post(`/repos/example/repository/git/commits`, body => {
        return body.message === 'Starter template setup' && body.tree === treeSha && body.parents[0] === sha
      })
      .reply(200, {
        sha: commitSha,
      })

    // create ref
    nock('https://api.github.com')
      .post(`/repos/example/repository/git/refs`, body => {
        return body.ref === 'refs/heads/assignment' && body.sha === commitSha
      })
      .reply(200, {
        sha: commitSha,
      })

    // create pull
    nock('https://api.github.com')
      .post(`/repos/example/repository/pulls`, body => {
        return (
          body.title === 'Asssignment' &&
          body.body.match(/^In this assignment/) &&
          body.head === 'assignment' &&
          body.base === 'master'
        )
      })
      .reply(200, {
        number: 1,
      })

    await run()
  })

  // it('doesn't run if there is already a pull request opened', async () => {})
  // it('doesn't run unless the pusher is ______', async () => {})
  // it('doesn't run if there is more than one commit ______', async () => {})
  // it('commits the example files to the pull request branch', async () => {})
  // it('logs a message if there are no files to commit', async () => {})
  // it('opens a pull request', async () => {})
  // it('does not open a pull request if the pull request template does not exist', async () => {})
})
