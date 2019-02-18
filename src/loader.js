"use strict";

const loaderUtils = require('loader-utils');

const parseDash = (str) => {
	let dashArr = str.split("-");
	let camelArr = [];

	for (let i = 0; i < dashArr.length; i++) {
		camelArr[i] = `${dashArr[i].charAt(0).toUpperCase()}${dashArr[i].substring(1)}`;
	}
	return {
		dashArr,
		camelArr
	};
}


module.exports = function(source) {
	const options = loaderUtils.getOptions(this);

	this.cacheable();

	let newSource = source;

	let target = source.match(/<vcm?-([a-z\-]+)([^\s>\/])/g).reduce((pre, cur, index, source) => {

		if (source.indexOf(cur) === index) {
			let dash = cur.replace(/(<vc-?|\s)/g, '');

			pre.push({
				dash,
				camel: parseDash(dash).camelArr.join('')
			})
		};

		return pre;
	}, []);

	let content = target.reduce((pre, cur) => {
		let { imports, components } = pre;
		let importContent;
		
		if (cur.dash.includes('-item') || cur.dash.includes('-group')) {
			let { dashArr, camelArr } = parseDash(cur.dash);
			importContent = `import ${camelArr.slice(0, -1).join('')} from 'wya-vc/lib/${dashArr.slice(0, -1).join('')}';\n`;
			components = pre.components + `		'${/^m-/.test(cur.dash) ? 'vc' : 'vc-'}${cur.dash}': ${camelArr.slice(0, -1).join('')}.${camelArr[camelArr.length - 1]},\n`;
		} else {
			importContent = `import ${cur.camel} from 'wya-vc/lib/${cur.dash}';\n`;
			components = pre.components + `		'${/^m-/.test(cur.dash) ? 'vc' : 'vc-'}${cur.dash}': ${cur.camel},\n`;
		}
		
		if (!pre.imports.includes(importContent)) {
			imports = pre.imports + importContent;
		}

		return {
			imports,
			components
		}
	}, {
		imports: '\n',
		components: '\n'
	})
	
	let codeSplit;

	codeSplit = newSource.split('<script>');

	newSource = codeSplit[0] + '<script>' + content.imports + codeSplit[1];

	// 可能存在问题. todo：精简代码
	let hasInject = newSource.includes('	components: {');
	let isPortal = newSource.includes('const config = {');

	codeSplit = hasInject 
		? newSource.split('	components: {') 
		: isPortal 
			? newSource.split('const config = {')
			: newSource.split('export default {');

	newSource = hasInject 
		? codeSplit[0] + '	components: {' + content.components + codeSplit[1] 
		: isPortal 
			? codeSplit[0] + 'const config = {' + '\n	components: {' + content.components + '	},\n' + codeSplit[1]
			: codeSplit[0] + 'export default {' + '\n	components: {' + content.components + '	},\n' + codeSplit[1];

	return newSource;
};