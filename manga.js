const Chapter = require("./chapter").Chapter;

class Manga {
	constructor(id, name, cover, alternative, authors, status, genres, updated, views, rating, description, url, chapters) {
		this.id = id;
		this.name = name;
		this.cover = cover;
		this.alternative = alternative;
		this.authors = authors;
		this.status = status;
		this.genres = genres;
		this.updated = updated;
		this.views = views;
		this.rating = rating;
		this.description = description;
		this.url = url;

		this.chapters = chapters.map((chapter) => new Chapter(chapter.title, chapter.views, chapter.upload_date, chapter.url));
	}
}

module.exports = {Manga};
