const Page = require("./page").Page;

class Chapter {
	constructor(title, views, upload_date, url, id = undefined) {
		this.id = !id ? url.split("/").pop() : id;
		this.title = title;
		this.views = views;
		this.upload_date = upload_date;
		this.url = url;

		this.pages = undefined;
	}

	fillPages(pages) {
		this.pages = pages.map((page, i) => new Page(i + 1, page));

		return this;
	}
}

module.exports = {Chapter};
