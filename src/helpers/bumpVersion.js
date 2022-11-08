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

    // split up release version
    [releaseMajor, releaseMinor, releasePatch] = lastRelease.split('.');
    releaseMajor = parseInt(releaseMajor, 10);
    releaseMinor = parseInt(releaseMinor, 10);
    releasePatch = parseInt(releasePatch, 10);

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
  }

  newVersion = `${major}.${minor}.${patch}`;

  // apply pre-release version
  if(inputPrereleasePrefix) {

    let previousBaseVersion, previousPrerelease, previousPrereleaseVersion;
    [previousBaseVersion, previousPrerelease] = lastVersion.split('-');

    if (previousPrerelease && previousBaseVersion) {

      [, previousPrereleaseVersion] = previousPrerelease.split('.');

      let prereleaseMajor, prereleaseMinor, prereleasePatch;

      [prereleaseMajor, prereleaseMinor, prereleasePatch] = previousBaseVersion.split('.');
      prereleaseMajor = parseInt(prereleaseMajor, 10);
      prereleaseMinor = parseInt(prereleaseMinor, 10);
      prereleasePatch = parseInt(prereleasePatch, 10);

      core.debug(`Matching major version: ${prereleaseMajor === major}`);
      core.debug(`Matching minor version: ${prereleaseMinor === minor}`);
      core.debug(`Matching patch version: ${prereleasePatch === patch}`);

      // base versions match so apply prerelease version
      if (previousPrereleaseVersion && prereleaseMajor === major && prereleaseMinor === minor && prereleasePatch === patch) {
        // release type didn't change from previous prerelease, increment prerelease version
        console.log(`Previous prerelease number: ${previousPrereleaseVersion}`);
        const prereleaseVersionInt = parseInt(previousPrereleaseVersion, 10);
        prereleaseVersion = prereleaseVersionInt+1;

        newVersion = `${major}.${minor}.${patch}-${inputPrereleasePrefix}.${prereleaseVersion}`;
      }
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
