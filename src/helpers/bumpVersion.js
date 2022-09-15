const core = require('@actions/core')
const semverValid = require('semver').valid

const requireScript = require('./requireScript')

/**
 * Bumps the given version with the given release type
 *
 * @param releaseType
 * @param version
 * @returns {string}
 */
module.exports = async (releaseType, version) => {
  let major, minor, patch, normalTag, prereleaseTag, prereleasePrefix, prereleaseVersion

  let prerelease = core.getInput('prerelease')

  if (version) {
    [normalTag, prereleaseTag] = version.split('-');
    [major, minor, patch] = normalTag.split('.');
    [prereleasePrefix, prereleaseVersion] = prereleaseTag.split('.');

    if (prerelease) {

      // prereleases with version
      core.info(`Pre-release with previous version: ${version}`)

      major = parseInt(major, 10)
      minor = parseInt(minor, 10)
      patch = parseInt(patch, 10)
      prereleaseVersion = parseInt(prereleaseVersion, 10) + 1

    } else {

      // releases with version
      core.info(`Release with previous version: ${version}`)

      switch (releaseType) {
        case 'major':
          major = parseInt(major, 10) + 1
          minor = 0
          patch = 0
          break

        case 'minor':
          minor = parseInt(minor, 10) + 1
          patch = 0
          break

        default:
          patch = parseInt(patch, 10) + 1
      }
    }
  } else {

    // anything with no version

    let version = semverValid(core.getInput('fallback-version'))
    prereleaseVersion = 0;

    if (version) {
      [major, minor, patch] = version.split('.')
    } else {
      // default
      major = 0
      minor = 1
      patch = 0
    }

    core.info(`The previous version could not be detected, using fallback '${major}.${minor}.${patch}'.`)
  }

  const preChangelogGenerationFile = core.getInput('pre-changelog-generation')

  let newVersion;

  if(prerelease) {

    // special case where prerelease prefixes change
    if(prerelease !== prereleasePrefix){
      core.debug(`Prerelease prefix has changed from ${prereleasePrefix} to ${prerelease}`)
      prereleaseVersion = 0
    }

    // prerelease
    newVersion = `${major}.${minor}.${patch}-${prerelease}.${prereleaseVersion}`
  } else {

    // release
    newVersion = `${major}.${minor}.${patch}`
  }

  core.info(`Unmodified new version: ${newVersion}`)

  if (preChangelogGenerationFile) {
    const preChangelogGenerationScript = requireScript(preChangelogGenerationFile)

    // Double check if we want to update / do something with the version
    if (preChangelogGenerationScript && preChangelogGenerationScript.preVersionGeneration) {
      const modifiedVersion = await preChangelogGenerationScript.preVersionGeneration(newVersion)

      if (modifiedVersion) {
        core.info(`Using modified version "${modifiedVersion}"`)
        newVersion = modifiedVersion
      }
    }
  }

  return newVersion
}
