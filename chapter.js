class Chapter {
	constructor(title, views, upload_date, url) {
		this.title = title;
		this.views = views;
		this.upload_date = upload_date;
		this.url = url;

		this.pages = [];
	}
}

module.exports = {Chapter};
