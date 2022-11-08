const core = require('@actions/core')
const gitSemverTags = require('git-semver-tags')

const BaseVersioning = require('./base')
const bumpVersion = require('../helpers/bumpVersion')

module.exports = class Git extends BaseVersioning {

  bump = (releaseType) => {

    const compareSemanticVersions = (a,b) => {

      let aVer, aPre, bVer, bPre;

      [aVer,aPre] = a.split('-');
      [bVer,bPre] = b.split('-');
      const a1 = aVer.split('.');
      const b1 = bVer.split('.');

      // check main version number
      for (let i = 0; i < 3; i++) {
        const a2 = +a1[ i ] || 0;
        const b2 = +b1[ i ] || 0;

        // versions are different
        if (a2 !== b2) {
          return a2 > b2 ? 1 : -1;
        }
      }

      // check prerelease version number
      let a2,b2;
      if(aPre){
        [,a2] = aPre.split('.')
      }
      if(bPre){
        [,b2] = bPre.split('.')
      }

      if(a2){
        a2 = parseInt(a2, 10);

        if(b2){
          b2 = parseInt(b2, 10);
          return a2 > b2 ? 1 : -1;
        }else{
          return -1;
        }
      }else if(b2){
        return 1;
      }

      // versions are equal
      return -1;
    };

    return new Promise((resolve) => {
      const tagPrefix = core.getInput('tag-prefix')

      gitSemverTags({ tagPrefix, }, async (err, tags) => {

        core.info(`Tags received: ${tags}`)

        // order the tags
        tags.sort(compareSemanticVersions);

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
