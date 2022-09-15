const core = require('@actions/core')
const semverValid = require('semver').valid

const requireScript = require('./requireScript')

/**
 * Bumps the given version with the given release type
 *
 * @param releaseType
 * @param lastVersion
 * @param lastRelease
 * @returns {string}
 */
module.exports = async (releaseType, lastVersion, lastRelease) => {
  let major, minor, patch, prereleaseVersion, newVersion;

  let inputPrereleasePrefix = core.getInput('prerelease');

  // get the previous release
  if (lastRelease){

    // last release exists
    core.info(`Previous release: ${lastRelease}`);
    let releaseMajor, releaseMinor, releasePatch;
    let previousMajor, previousMinor, previousPatch;
    let previousBaseVersion, previousPrerelease, previousPrereleasePrefix, previousPrereleaseVersion;

    // split up release version
    [releaseMajor, releaseMinor, releasePatch] = lastRelease.split('.');
    releaseMajor = parseInt(releaseMajor, 10);
    releaseMinor = parseInt(releaseMinor, 10);
    releasePatch = parseInt(releasePatch, 10);

    if (lastVersion) {

      [previousBaseVersion, previousPrerelease] = lastVersion.split('-');

      // split up previous prerelease version (if present)
      if (previousPrerelease) {
        // previous version was a prerelease
        [previousPrereleasePrefix, previousPrereleaseVersion] = previousPrerelease.split('.');
        previousPrereleaseVersion = parseInt(previousPrereleaseVersion, 10);
      }

      // split up previous version (should always be present)
      if (previousBaseVersion) {
        [previousMajor, previousMinor, previousPatch] = lastRelease.split('.');
        previousMajor = parseInt(previousMajor, 10);
        previousMinor = parseInt(previousMinor, 10);
        previousPatch = parseInt(previousPatch, 10);
      }
    }

    // calculate base version
    switch (releaseType) {
      case 'major':
        major = releaseMajor + 1;
        minor = 0;
        patch = 0;
        break;

      case 'minor':
        major = releaseMajor;
        minor = releaseMinor + 1;
        patch = 0;
        break;

      default:
        major = releaseMajor;
        minor = releaseMinor;
        patch = releasePatch + 1;
    }


    if (inputPrereleasePrefix) {
      // this is a prerelease
      prereleaseVersion = 0; // default

      if (previousPrereleaseVersion) {
        // previous version was a prerelease with version
        if (inputPrereleasePrefix === previousPrereleasePrefix) {
          // previous prerelease has the same prefix
          if (previousMajor === major && previousMinor === minor && previousPatch === patch) {
            // release type didn't change from previous prerelease, increment prerelease version
            prereleaseVersion = previousPrereleaseVersion + 1;
          }
        }
      }

      newVersion = `${major}.${minor}.${patch}-${inputPrereleasePrefix}.${prereleaseVersion}`;

    } else {
      // this is a release
      newVersion = `${major}.${minor}.${patch}`;
    }

  } else {

    // last release does not exist, use fallback
    let fallback = semverValid(core.getInput('fallback-version'));

    if (fallback) {

      // split up fallback
      [major, minor, patch] = fallback.split('.');
      major = parseInt(major, 10);
      minor = parseInt(minor, 10);
      patch = parseInt(patch, 10);

    } else {

      // default
      major = 0;
      minor = 1;
      patch = 0;

    }

    core.info(`The previous release could not be detected, using fallback '${major}.${minor}.${patch}'.`);

    if (inputPrereleasePrefix) {
      // this is a prerelease
      newVersion = `${major}.${minor}.${patch}-${inputPrereleasePrefix}.0`;

    } else {
      // this is a release
      newVersion = `${major}.${minor}.${patch}`;
    }
  }

  core.info(`Unmodified new version: ${newVersion}`);

  const preChangelogGenerationFile = core.getInput('pre-changelog-generation');

  if (preChangelogGenerationFile) {
    const preChangelogGenerationScript = requireScript(preChangelogGenerationFile);

    // Double check if we want to update / do something with the version
    if (preChangelogGenerationScript && preChangelogGenerationScript.preVersionGeneration) {
      const modifiedVersion = await preChangelogGenerationScript.preVersionGeneration(newVersion);

      if (modifiedVersion) {
        core.info(`Using modified version "${modifiedVersion}"`);
        newVersion = modifiedVersion;
      }
    }
  }

  return newVersion;
}
