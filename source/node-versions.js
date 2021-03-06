/* eslint-disable no-use-before-define */

// external
import fetch from 'node-fetch'
import Errlop from 'errlop'
import withinRange from 'version-range'
import versionCompare from 'version-compare'
import { last } from '@bevry/list'

// prepare date
const nodeVersionsMap = new Map()
const nodeVersionsList = []
let nodeVersionLatestCurrent,
	nodeVersionLatestActive,
	nodeVersionLatestMaintenance
const now = new Date().getTime()

// fetch
export async function fetchNodeVersions() {
	if (nodeVersionsMap.size) return true
	// https://github.com/nodejs/Release
	const url =
		'https://raw.githubusercontent.com/nodejs/Release/master/schedule.json'
	try {
		// fetch node versions that have been released
		const response = await fetch(url)
		const json = await response.json()
		nodeVersionsMap.set('0.8', {
			version: '0.8',
			start: new Date('2012-06-25'),
			end: new Date('2014-07-31'),
		})
		for (const [key, meta] of Object.entries(json)) {
			const version = key.replace('v', '')
			const start = new Date(meta.start)
			const end = new Date(meta.end)
			let maintenance, lts
			if (meta.maintenance) maintenance = new Date(meta.maintenance)
			if (meta.lts) lts = new Date(meta.lts)
			nodeVersionsMap.set(version, {
				version,
				start,
				end,
				maintenance,
				lts,
				codename: meta.codename,
			})
		}
		nodeVersionsList.push(...Array.from(nodeVersionsMap.keys()))
		nodeVersionLatestCurrent = last(
			filterNodeVersions(nodeVersionsList, { current: true })
		)
		nodeVersionLatestActive = last(
			filterNodeVersions(nodeVersionsList, { active: true })
		)
		nodeVersionLatestMaintenance = last(
			filterNodeVersions(nodeVersionsList, { maintenance: true })
		)
		return true
	} catch (err) {
		throw new Errlop(
			`Failed to fetch Node.js release schedule from ${url}`,
			err
		)
	}
}

/** Get the release metadata for the version number */
export function getNodeVersion(version) {
	const meta = nodeVersionsMap.get(String(version))
	if (!meta)
		throw new Error(
			`Unable to find the Node.js version: ${JSON.stringify(version)}`
		)
	return meta
}

/** Has the version existed at some point? */
export function isNodeVersionBorn(version) {
	const meta = getNodeVersion(version)
	const start = meta.start
	if (!start) return false
	return now >= start.getTime()
}

/**
 * Is the version currently maintained?
 * Current || Active || Maintenance
 */
export function isNodeVersionMaintained(version) {
	const meta = getNodeVersion(version)
	const start = meta.start
	const end = meta.end
	if (!start || !end) return false
	return now >= start.getTime() && now <= end.getTime()
}

/** Is the version at some point an LTS release? */
export function isNodeVersionLTS(version) {
	const meta = getNodeVersion(version)
	return Boolean(meta.lts)
}

/**
 * Is the version an active LTS release?
 * Active LTS - New features, bug fixes, and updates that have been audited by the LTS team and have been determined to be appropriate and stable for the release line.
 */
export function isNodeVersionActive(version) {
	const meta = getNodeVersion(version)
	const start = meta.lts
	const end = meta.maintenance || meta.end
	if (!start || !end) return false
	return now >= start.getTime() && now <= end.getTime()
}

/**
 * Is the version a current release?
 * Current - Should incorporate most of the non-major (non-breaking) changes that land on nodejs/node master branch.
 */
export function isNodeVersionCurrent(version) {
	const meta = getNodeVersion(version)
	const start = meta.start
	const end = meta.lts || meta.maintenance || meta.end
	if (!start || !end) return false
	return now >= start.getTime() && now <= end.getTime()
}

/**
 * Is the version a active or current release?
 * That is to say it isn't in maintenance mode, or EOL.
 */
export function isNodeVersionActiveOrCurrent(version) {
	const meta = getNodeVersion(version)
	const start = meta.start
	const end = meta.maintenance || meta.end
	if (!start || !end) return false
	return now >= start.getTime() && now <= end.getTime()
}

/**
 * Is the version a maintenance release?
 * Maintenance - Critical bug fixes and security updates. New features may be added at the discretion of the LTS team - typically only in cases where the new feature supports migration to later release lines.
 */
export function isNodeVersionMaintenance(version) {
	const meta = getNodeVersion(version)
	const start = meta.maintenance
	const end = meta.end
	if (!start || !end) return false
	return now >= start.getTime() && now <= end.getTime()
}

/**
 * Is the version a maintained release or a historical LTS release?
 */
export function isNodeVersionMaintainedOrLTS(version) {
	const meta = getNodeVersion(version)
	// is it a LTS release, or is it a release before LTS was a thing (no lts and no maintenance details)
	// 0.8, 0.10, 0.12
	if (meta.lts || !meta.maintenance) return true
	const start = meta.start
	const end = meta.end
	if (!start || !end) return false
	return now >= start.getTime() && now <= end.getTime()
}

/** Is the version greater than or equal to the seek version? */
export function isNodeVersionGTE(seek) {
	return function (version) {
		return versionCompare(version, seek) >= 0
	}
}

/** Is the version lesser than or equal to the seek version? */
export function isNodeVersionLTE(seek) {
	return function (version) {
		return versionCompare(version, seek) <= 0
	}
}

/** Is the version within (inclusive) of these two versions? */
export function isNodeVersionWithin(lesser, greater) {
	return function (version) {
		return (
			versionCompare(version, lesser) >= 0 &&
			versionCompare(version, greater) <= 0
		)
	}
}

/** Does the version natively support ESM? */
export function isNodeVersionESM(version) {
	return versionCompare(version, '12') >= 0
}

/**
 * Is the node version compatible with vercel?
 * https://vercel.com/docs/serverless-functions/supported-languages?query=node%20version#defined-node.js-version
 * https://vercel.com/docs/runtimes#official-runtimes/node-js/node-js-version
 */
export function isNodeVersionVercel(version) {
	return (
		versionCompare(version, '10') === 0 || versionCompare(version, '12') === 0
	)
}

/** Is the version of these versions? */
export function isNodeVersionThese(these) {
	return function (version) {
		return these.find((seek) => versionCompare(version, seek) === 0)
	}
}

/** Is the version within this range? */
export function isNodeVersionWithinRange(range) {
	return function (version) {
		return withinRange(version, range)
	}
}

/**
 * Is the version the latest current release?
 * Current > Active > Maintenance > EOL
 */
export function isNodeVersionLatestCurrent(version) {
	return versionCompare(version, nodeVersionLatestCurrent) === 0
}

/**
 * Is the version the latest active LTS release?
 * Current > Active > Maintenance > EOL
 */
export function isNodeVersionLatestActive(version) {
	return versionCompare(version, nodeVersionLatestActive) === 0
}

/**
 * Is the version the latest maintenance release?
 * Current > Active > Maintenance > EOL
 */
export function isNodeVersionLatestMaintenance(version) {
	return versionCompare(version, nodeVersionLatestMaintenance) === 0
}

/** Filter the versions */
export function filterNodeVersions(versions, filters = {}) {
	// Extract
	let { these } = filters
	const {
		lts,
		active,
		current,
		activeOrCurrent,
		maintainedOrLTS,
		maintenance,
		born = true,
		maintained,
		esm,
		vercel,
		gte,
		lte,
		range,
	} = filters

	// is the node version compatible with vercel
	if (vercel) these = versions.filter(isNodeVersionVercel)

	// range
	if (range) versions = versions.filter(isNodeVersionWithinRange(range))

	// gte
	if (gte) versions = versions.filter(isNodeVersionGTE(gte))

	// lte
	if (lte) versions = versions.filter(isNodeVersionLTE(lte))

	// certain numbers
	if (these) versions = versions.filter(isNodeVersionThese(these))

	// only born releases
	if (born) versions = versions.filter(isNodeVersionBorn)

	// only releases that are maintained
	if (maintained) versions = versions.filter(isNodeVersionMaintained)

	// only LTS releases
	if (lts) versions = versions.filter(isNodeVersionLTS)

	// only active LTS releases
	if (active) versions = versions.filter(isNodeVersionActive)

	// only current releases
	if (current) versions = versions.filter(isNodeVersionCurrent)

	// only active or current releases
	if (activeOrCurrent) versions = versions.filter(isNodeVersionActiveOrCurrent)

	// only releases that are maintained, or historical LTS releases
	if (maintainedOrLTS) versions = versions.filter(isNodeVersionMaintainedOrLTS)

	// only maintenance releases
	if (maintenance) versions = versions.filter(isNodeVersionMaintenance)

	// only releases that support native ESM
	if (esm) versions = versions.filter(isNodeVersionESM)

	// return
	return versions
}

/** Fetch and then filter the versions */
export async function fetchAndFilterNodeVersions(filters) {
	await fetchNodeVersions()
	return filterNodeVersions(nodeVersionsList, filters)
}
