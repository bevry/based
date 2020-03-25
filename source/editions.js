/* eslint no-console:0 */
'use strict'

// External
const pathUtil = require('path')

// Local
const { status } = require('./log')
const { add, has, strip, addExtension } = require('./util.js')
const languageNames = {
	typescript: 'TypeScript',
	esnext: 'ESNext',
	es5: 'ES5',
	coffeescript: 'CoffeeScript',
}

// Helpers
class Edition {
	constructor(opts) {
		Object.defineProperty(this, 'targets', {
			enumerable: false,
			writable: true,
		})

		Object.defineProperty(this, 'dependencies', {
			enumerable: false,
			writable: true,
		})

		Object.defineProperty(this, 'devDependencies', {
			enumerable: false,
			writable: true,
		})

		Object.defineProperty(this, 'compiler', {
			enumerable: false,
			writable: true,
		})

		Object.defineProperty(this, 'scripts', {
			enumerable: false,
			writable: true,
		})

		Object.defineProperty(this, 'compiler', {
			enumerable: false,
			writable: true,
		})

		Object.defineProperty(this, 'babel', {
			enumerable: false,
			writable: true,
		})

		Object.defineProperty(this, 'active', {
			enumerable: false,
			writable: true,
		})

		Object.defineProperty(this, 'main', {
			enumerable: false,
			get() {
				return this.entry
			},
			set(value) {
				this.entry = value
			},
		})

		Object.defineProperty(this, 'browser', {
			enumerable: false,
			writable: true,
		})

		Object.defineProperty(this, 'test', {
			enumerable: false,
			writable: true,
		})

		Object.defineProperty(this, 'bin', {
			enumerable: false,
			writable: true,
		})

		Object.defineProperty(this, 'mainPath', {
			enumerable: false,
			get() {
				return this.main && pathUtil.join(this.directory || '.', this.main)
			},
		})

		Object.defineProperty(this, 'browserPath', {
			enumerable: false,
			get() {
				return (
					this.browser && pathUtil.join(this.directory || '.', this.browser)
				)
			},
		})

		Object.defineProperty(this, 'testPath', {
			enumerable: false,
			get() {
				return this.test && pathUtil.join(this.directory || '.', this.test)
			},
		})

		Object.defineProperty(this, 'binPath', {
			enumerable: false,
			get() {
				return this.bin && pathUtil.join(this.directory || '.', this.bin)
			},
		})

		opts.tags = new Set(opts.tags || [])
		opts.dependencies = new Set(opts.dependencies || [])
		opts.devDependencies = new Set(opts.devDependencies || [])

		Object.assign(this, { scripts: {}, active: true }, opts)
	}
}

// Actions
async function generateEditions(state) {
	const { answers, packageData } = state

	// log
	status('updating editions...')

	// handle
	if (answers.website) {
		delete packageData.main
		state.editions = [
			new Edition({
				description: 'source',
				directory: '.',
				tags: [
					'website',
					...answers.languages,
					answers.sourceModule ? 'import' : 'require',
				],
			}),
		]
	} else {
		const editions = new Map()

		// Generate base editions based on language
		if (answers.language === 'es5') {
			const edition = new Edition({
				directory: answers.sourceDirectory,
				main: addExtension(answers.mainEntry, `js`),
				browser: addExtension(answers.browserEntry, `js`),
				test: addExtension(answers.testEntry, `js`),
				bin: addExtension(answers.binEntry, `js`),
				tags: [
					'javascript',
					'es5',
					answers.sourceModule ? 'import' : 'require',
				],
				engines: {
					node: true,
					browsers: answers.browsers,
				},
			})

			if (answers.flowtype) {
				add(edition.tags, 'flow type comments')
			}

			editions.set('source', edition)
		} else if (answers.language === 'esnext') {
			const edition = new Edition({
				directory: answers.sourceDirectory,
				main: addExtension(answers.mainEntry, `js`),
				browser: addExtension(answers.browserEntry, `js`),
				test: addExtension(answers.testEntry, `js`),
				bin: addExtension(answers.binEntry, `js`),
				tags: [
					'javascript',
					'esnext',
					answers.sourceModule ? 'import' : 'require',
				],
				engines: {
					node: true,
					browsers:
						answers.browsers && answers.targets.includes('browser') === false,
				},
			})

			if (answers.flowtype) {
				add(edition.tags, 'flow type comments')
			}

			editions.set('source', edition)
		} else if (answers.language === 'typescript') {
			editions.set(
				'source',
				new Edition({
					directory: answers.sourceDirectory,
					main: addExtension(answers.mainEntry, `ts`),
					browser: addExtension(answers.browserEntry, `ts`),
					test: addExtension(answers.testEntry, `ts`),
					bin: addExtension(answers.binEntry, `js`),
					tags: ['typescript', 'import'],
					engines: false,
				})
			)
		} else if (answers.language === 'coffeescript') {
			editions.set(
				'source',
				new Edition({
					directory: answers.sourceDirectory,
					main: addExtension(answers.mainEntry, `coffee`),
					browser: addExtension(answers.browserEntry, `coffee`),
					test: addExtension(answers.testEntry, `coffee`),
					bin: addExtension(answers.binEntry, `coffee`),
					tags: ['coffeescript', 'require'],
					engines: false,
				})
			)
		} else if (answers.language === 'json') {
			editions.set(
				'source',
				new Edition({
					description: 'JSON',
					directory: answers.sourceDirectory,
					main: addExtension(answers.mainEntry, `json`),
					browser: addExtension(answers.browserEntry, `json`),
					test: addExtension(answers.testEntry, `js`),
					bin: addExtension(answers.binEntry, `js`),
					tags: ['json'],
					engines: {
						node: true,
						browsers:
							answers.browsers && answers.targets.includes('browser') === false,
					},
				})
			)
		} else {
			throw new Error('language should have been defined, but it was missing')
		}

		// Add the compiled editions if necessary
		for (const target of answers.targets) {
			if (target === 'browser') {
				editions.set(
					'browser',
					new Edition({
						compiler: answers.compilerBrowser,
						// for legacy b/c reasons this is not "edition-browser"
						directory: 'edition-browsers',
						main: addExtension(answers.browserEntry, `js`),
						browser: addExtension(answers.browserEntry, `js`),
						test: addExtension(answers.testEntry, `js`),
						bin: addExtension(answers.binEntry, `js`),
						tags: ['javascript', answers.sourceModule ? 'import' : 'require'],
						targets: {
							es: 'ESNext',
							esmodules: answers.sourceModule,
							browsers: answers.browsers,
						},
						engines: {
							node: false,
							browsers: answers.browsers,
						},
					})
				)
			} else if (answers.compilerNode === 'babel') {
				let version
				if (target === 'desired') {
					version = answers.desiredNodeVersion
				} else if (target === 'minimum') {
					version = answers.minimumSupportNodeVersion
				} else if (target === 'maximum') {
					version = answers.maximumSupportNodeVersion
				} else {
					throw new Error(`invalid target: ${target}`)
				}
				editions.set(
					`node-${version}`,
					new Edition({
						compiler: 'babel',
						directory: `edition-node-${version}`,
						main: addExtension(answers.mainEntry, `js`),
						browser: addExtension(answers.browserEntry, `js`),
						test: addExtension(answers.testEntry, `js`),
						bin: addExtension(answers.binEntry, `js`),
						tags: ['javascript', answers.packageModule ? 'import' : 'require'],
						targets: {
							node: version,
						},
						engines: {
							node: true,
							browsers: false,
						},
					})
				)
			} else if (answers.compilerNode === 'typescript') {
				const syntax = target.toLocaleLowerCase()
				const directory = `edition-${syntax}`
				editions.set(
					syntax,
					new Edition({
						compiler: 'typescript',
						directory,
						main: addExtension(answers.mainEntry, `js`),
						browser: addExtension(answers.browserEntry, `js`),
						test: addExtension(answers.testEntry, `js`),
						bin: addExtension(answers.binEntry, `js`),
						tags: [
							'javascript',
							syntax,
							answers.packageModule ? 'import' : 'require',
						],
						targets: {
							es: target,
						},
						engines: {
							node: true,
							browsers:
								answers.browsers &&
								answers.targets.includes('browser') === false,
						},
					})
				)
			} else if (answers.compilerNode === 'coffeescript') {
				const syntax = target.toLocaleLowerCase()
				const directory = `edition-${syntax}`
				editions.set(
					syntax,
					new Edition({
						compiler: 'coffeescript',
						directory,
						main: addExtension(answers.mainEntry, `js`),
						browser: addExtension(answers.browserEntry, `js`),
						test: addExtension(answers.testEntry, `js`),
						bin: addExtension(answers.binEntry, `js`),
						tags: ['javascript', 'esnext', 'require'],
						engines: {
							node: true,
							browsers:
								answers.browsers &&
								answers.targets.includes('browser') === false,
						},
					})
				)
			} else {
				throw new Error(`invalid target: ${target}`)
			}
		}

		// autogenerate various fields
		editions.forEach(function (edition) {
			const browserVersion =
				(edition.targets && edition.targets.browsers) ||
				(edition.engines && edition.engines.browsers)
			const nodeVersion =
				(edition.targets && edition.targets.node) ||
				(edition.engines && edition.engines.node)

			// add compilation details
			if (edition.compiler === 'coffeescript') {
				edition.scripts[
					`our:compile:${edition.directory}`
				] = `coffee -bco ./${edition.directory} ./${answers.sourceDirectory}`
			} else if (edition.compiler === 'typescript') {
				edition.scripts[`our:compile:${edition.directory}`] = [
					'tsc',
					has(edition.tags, 'require')
						? '--module commonjs'
						: '--module ESNext',
					`--target ${edition.targets.es}`,
					`--outDir ./${edition.directory}`,
					`--project ${answers.tsconfig}`,
					// fix typescript embedding the source directory inside the output
					`&& test -d ${edition.directory}/${answers.sourceDirectory}`,
					`&& (`,
					`mv ${edition.directory}/${answers.sourceDirectory} edition-temp`,
					`&& rm -Rf ${edition.directory}`,
					`&& mv edition-temp ${edition.directory}`,
					`) || true`,
				]
					.filter((part) => part)
					.join(' ')
			} else if (edition.compiler === 'babel') {
				if (answers.language === 'coffeescript') {
					// add coffee compile script
					edition.scripts[`our:compile:${edition.directory}`] = [
						`env BABEL_ENV=${edition.directory}`,
						'coffee -bcto',
						`./${edition.directory}/`,
						`./${answers.sourceDirectory}`,
					]
						.filter((part) => part)
						.join(' ')
				} else {
					// add babel compile script
					edition.scripts[`our:compile:${edition.directory}`] = [
						`env BABEL_ENV=${edition.directory}`,
						'babel',
						answers.language === 'typescript' ? '--extensions ".ts,.tsx"' : '',
						`--out-dir ./${edition.directory}`,
						`./${answers.sourceDirectory}`,
					]
						.filter((part) => part)
						.join(' ')
				}

				// populate babel
				edition.babel = {
					sourceType: answers.sourceModule ? 'module' : 'script',
					presets: [
						[
							'@babel/preset-env',
							{
								targets: strip(edition.targets, 'es'),
								modules:
									edition.targets.esmodules ||
									answers.sourceModule === answers.packageModule
										? false
										: answers.packageModule
										? 'auto'
										: 'commonjs',
							},
						],
					],
					plugins: ['@babel/proposal-object-rest-spread'],
				}

				add(
					edition.devDependencies,
					'@babel/core',
					'@babel/cli',
					'@babel/preset-env',
					'@babel/plugin-proposal-object-rest-spread'
				)

				if (answers.language === 'typescript') {
					add(edition.babel.presets, '@babel/preset-typescript')
					add(
						edition.babel.plugins,
						'@babel/plugin-proposal-optional-chaining',
						'@babel/proposal-class-properties'
					)
					add(
						edition.devDependencies,
						'@babel/core',
						'@babel/preset-typescript',
						'@babel/plugin-proposal-class-properties',
						'@babel/plugin-proposal-object-rest-spread',
						'@babel/plugin-proposal-optional-chaining'
					)
				}
			}

			// ensure description exists
			if (!edition.description) {
				const description = [
					languageNames[answers.language] || answers.language,
					edition.directory === answers.sourceDirectory
						? 'source code'
						: 'compiled',
				]
				if (edition.targets && edition.targets.es) {
					// what the typescript compiler targets
					description.push(`against ${edition.targets.es}`)
				}
				if (browserVersion) {
					description.push(`for web browsers`)
					if (
						typeof browserVersion === 'string' &&
						browserVersion !== 'defaults'
					) {
						description.push(`[${browserVersion}]`)
					}
				}
				if (nodeVersion) {
					description.push(browserVersion ? 'and' : 'for', `Node.js`)
					if (typeof nodeVersion === 'string') {
						// typescript compiler will be true, as typescript doesn't compile to specific node versions
						description.push(`${nodeVersion}`)
					}
				}
				if (has(edition.tags, 'require')) {
					description.push('with Require for modules')
				} else if (has(edition.tags, 'import')) {
					description.push('with Import for modules')
				}
				edition.description = description.join(' ')
			}
		})

		// prepare
		state.editions = Array.from(editions.values())
	}

	// log
	console.log(
		'editions:',
		state.editions.map((edition) => edition.directory).join(', ')
	)
	status('...updated editions')
}

module.exports = { generateEditions }
