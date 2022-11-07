const core = require('@actions/core')
const gitSemverTags = require('git-semver-tags')

const BaseVersioning = require('./base')
const bumpVersion = require('../helpers/bumpVersion')

module.exports = class Git extends BaseVersioning {

  bump = (releaseType) => {
    return new Promise((resolve) => {
      const tagPrefix = core.getInput('tag-prefix')

      gitSemverTags({ tagPrefix, }, async (err, tags) => {

        core.info(`Tags received: ${tags}`)

        // order the tags
        tags.sort();

        // get the last tag
        let prereleases = tags.map((tag) => tag.replace(tagPrefix, '')).filter((tag) => {return tag.split('-').length > 1})
        const currentVersion = prereleases.length > 0 ? prereleases[prereleases.length -1] : null

        // get the last release tag
        let releases = tags.map((tag) => tag.replace(tagPrefix, '')).filter((tag) => {return tag.split('-').length === 1})
        const currentRelease = releases.length > 0 ? releases[releases.length -1] : null

        // Get the new version
        this.newVersion = await bumpVersion(
          releaseType,
          currentVersion,
          currentRelease
        )

        // We are done
        resolve()
      })
    })
  }

}
