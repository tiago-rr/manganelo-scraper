const Page = require("./page");

class Chapter {
	constructor(title, views, upload_date, url, pages) {
		this.title = title;
		this.views = views;
		this.upload_date = upload_date;
		this.url = url;

		this.pages = pages.map((page, index) => new Page(index + 1, page));
	}
}

module.exports = {Chapter};
