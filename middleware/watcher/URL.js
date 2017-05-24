import Object from 'j0/Object';

class URL {

	constructor(url, baseURL) {
		Object.assign(this, {
			protocol: '',
			host: '',
			hostname: '',
			port: '',
			pathname: '',
			search: '',
			hash: ''
		});
		if (baseURL) {
			if (!(baseURL instanceof URL)) {
				baseURL = new URL(baseURL);
			}
			Object.assign(baseURL, {
				pathname: '',
				search: '',
				hash: ''
			});
			Object.assign(this, baseURL);
		}
		if (url instanceof URL) {
			Object.assign(this, url);
		} else {
			this.parse(url);
		}
	}

	parse(url) {
		url
		.replace(/^\w+:/, (match) => {
			this.protocol = match;
			return '';
		})
		.replace(/\/\/([^/\s]+)/, (match, host) => {
			this.host = host;
			this.hostname = host.replace(/:(\d+)$/, (match2, port) => {
				this.port = port;
				return '';
			});
			return '';
		})
		.replace(/^([^/])/, '/$1')
		.replace(/\/[^?#]+/, (match) => {
			this.pathname = match;
			return '';
		})
		.replace(/\?[^#]+/, (match) => {
			this.search = match;
			return '';
		})
		.replace(/#.*$/, (match) => {
			this.hash = match;
			return '';
		});
	}

	get href() {
		return this.toString();
	}

	toString() {
		return `${this.protocol}//${this.host}${this.pathname}${this.search}${this.hash}`;
	}

}

export default URL;
