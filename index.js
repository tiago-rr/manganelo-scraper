const axios = require("axios");
const cheerio = require("cheerio");
const Manga = require("./manga").Manga; //Custome Manga object;
const Chapter = require("./chapter").Chapter;

class Scraper {
	//Cleaning up spaces in search. Return a string with all spaces replaced with '_'
	handleMangaName(mangaName) {
		return mangaName.replace(/ /g, "_");
	}

	//Return promise search results.
	async getMangaSearch(mangaSearch) {
		mangaSearch = this.handleMangaName(mangaSearch);
		let pageNum = 1;
		let pages = [];
		await axios.get("https://manganelo.com/search/story/" + mangaSearch + "?page=" + pageNum).then(async (res) => {
			const $ = cheerio.load(res.data);
			let pagesExist = parseInt($(".page-last").text().replace("LAST(", ""));
			if (pagesExist > 1) {
				pageNum = pagesExist;
			} else {
			}

			let loadPages = () => {
				for (let i = 1; i <= pageNum; i++) {
					pages.push(axios.get("https://manganelo.com/search/story/" + mangaSearch + "?page=" + pageNum));
				}
			};
			await loadPages();
		});
		return pages;
	}

	//Return promise with manga page results.
	getMangaPage(mangaURL) {
		return axios.get(mangaURL);
	}

	//Organises all urls from search and returns promise with array of urls.
	async getSearchURL(mangaName) {
		let urls = [];
		return await this.getMangaSearch(mangaName).then(async (res) => {
			for (let page of res) {
				await page.then((pageRes) => {
					const $ = cheerio.load(pageRes.data);
					let pageURL = [];
					$(".search-story-item").each((i, elm) => {
						let link = $(elm).find(".item-title").attr("href");
						pageURL.push(link);
					});
					urls = urls.concat(pageURL);
				});
			}
			return urls;
		});
	}

	//Scrapes data from each url retrieved from getMangaURL() and returns an array of Manga objects.
	getMangaDataFromSearch(mangaName) {
		return this.getSearchURL(mangaName).then(async (links) => {
			let mangas = [];
			for (let link of links) {
				let messyData = [];
				let name = null;
				await this.getMangaPage(link).then((res) => {
					const $ = cheerio.load(res.data);

					//Scraping data for name.
					name = $("h1").text();

					//Scraping data for alternative, authors, status, and genres.
					let tempOne = [];
					$(".variations-tableInfo")
						.children()
						.first()
						.children()
						.each((i, elm) => {
							tempOne.push($(elm).text().split("\n").join("").split(" :"));
						});

					//Fixing author label.
					for (let section of tempOne) {
						if (section[0] === "Author(s)") {
							section[0] = "authors";
							break;
						}
					}

					//Scraping data for updated, views, and ratings.
					let tempTwo = [];
					$(".story-info-right-extent")
						.children()
						.each((i, elm) => {
							tempTwo.push($(elm).text().split("\n").join().split("\n").join().split(" :"));
						});

					//Cleaning up data from preview scrape regarding updated, views, and ratings.
					tempTwo.length = 4;
					for (let i = 0; i < tempTwo.length; i++) {
						for (let j = 0; j < tempTwo[i].length; j++) {
							if (i > 1) {
								tempTwo[i][j] = tempTwo[i][j].replace(/,/g, "");
							}
						}
					}
					tempTwo[2][1] = tempTwo[3][1];
					tempTwo.length = 3;

					//Scraping data for description.
					let temp_desc = $(".panel-story-info-description").text().split(":").join().split(" ,");
					for (let i = 0; i < temp_desc.length; i++) {
						temp_desc[i] = temp_desc[i].replace(/\n/g, "");
					}

					let temp_cover = $(".img-loading").attr("src");

					//Scraping data for Chapters.
					let chapters = [];
					$(".row-content-chapter")
						.children()
						.each((i, elm) => {
							let chapter = $(elm).text().split("\n");
							let obj = {
								chapter: chapter[1],
								views: parseInt(chapter[2].replace(/,/g, "")),
								upload_date: chapter[3],
								url: "",
							};
							chapters.push(obj);
						});

					//Scraping for chapter url.
					let urls = [];
					$(".row-content-chapter")
						.children()
						.each((i, elm) => {
							let url = $(elm).find("a").attr("href");
							urls.push(url);
						});

					//Combining urls to chapter data.
					for (let i = 0; i < chapters.length; i++) {
						chapters[i].url = urls[i];
					}

					//Organizing description and chapters data.
					temp_desc = [temp_desc];
					chapters = [chapters];

					//Combining all data.
					messyData = messyData.concat(tempOne, tempTwo, temp_desc, chapters);
				});

				//Organizing messyData to create a clean Manga object.
				let tempObj = {};
				for (let i = 0; i < messyData.length - 1; i++) {
					tempObj[messyData[i][0]] = messyData[i][1];
				}

				//Organizing tempObj elements.
				tempObj.Alternative = tempObj.Alternative === undefined ? tempObj.Alternative : tempObj.Alternative.split(" ; ");
				tempObj.authors = tempObj.authors === undefined ? tempObj.authors : tempObj.authors.split(" - ");
				tempObj.Genres = tempObj.Genres === undefined ? tempObj.Genres : tempObj.Genres.split(" - ");
				tempObj.View = tempObj.View === undefined ? tempObj.View : parseInt(tempObj.View.replace(/,/g, ""));
				tempObj.Rating = tempObj.Rating === undefined ? tempObj.Rating : tempObj.Rating.split(" - ");
				tempObj.Rating = {
					ratingFromFive: tempObj.Rating[0],
					votes: parseInt(tempObj.Rating[1].replace(/,/g, "")),
				};

				//Creating Manga object.
				let manga = new Manga(
					name,
					temp_cover,
					tempObj.Alternative,
					tempObj.authors,
					tempObj.Status,
					tempObj.Genres,
					tempObj.Updated,
					tempObj.View,
					tempObj.Rating,
					tempObj.Description,
					link,
					messyData[messyData.length - 1],
				);
				mangas.push(manga);
			}
			return mangas;
		});
	}

	//Scrapes data from manga page given specific manga URL.
	getMangaDataFromURL(mangaURL) {
		return axios.get(mangaURL).then((res) => {
			let messyData = [];
			let name = null;
			const $ = cheerio.load(res.data);

			//Scraping data for name.
			name = $("h1").text();

			//Scraping data for alternative, authors, status, and genres.
			let tempOne = [];
			$(".variations-tableInfo")
				.children()
				.first()
				.children()
				.each((i, elm) => {
					tempOne.push($(elm).text().split("\n").join("").split(" :"));
				});

			//Fixing author label.
			for (let section of tempOne) {
				if (section[0] === "Author(s)") {
					section[0] = "authors";
					break;
				}
			}

			//Scraping data for updated, views, and ratings.
			let tempTwo = [];
			$(".story-info-right-extent")
				.children()
				.each((i, elm) => {
					tempTwo.push($(elm).text().split("\n").join().split("\n").join().split(" :"));
				});

			//Cleaning up data from preview scrape regarding updated, views, and ratings.
			tempTwo.length = 4;
			for (let i = 0; i < tempTwo.length; i++) {
				for (let j = 0; j < tempTwo[i].length; j++) {
					if (i > 1) {
						tempTwo[i][j] = tempTwo[i][j].replace(/,/g, "");
					}
				}
			}
			tempTwo[2][1] = tempTwo[3][1];
			tempTwo.length = 3;

			//Scraping data for description.
			let temp_desc = $(".panel-story-info-description").text().split(":").join().split(" ,");
			for (let i = 0; i < temp_desc.length; i++) {
				temp_desc[i] = temp_desc[i].replace(/\n/g, "");
			}

			let temp_cover = $(".img-loading").attr("src");

			//Scraping data for Chapters.
			let chapters = [];
			$(".row-content-chapter")
				.children()
				.each((i, elm) => {
					let chapter = $(elm).text().split("\n");
					let obj = {
						chapter: chapter[1],
						views: parseInt(chapter[2].replace(/,/g, "")),
						upload_date: chapter[3],
						url: "",
					};
					chapters.push(obj);
				});

			//Scraping for chapter url.
			let urls = [];
			$(".row-content-chapter")
				.children()
				.each((i, elm) => {
					let url = $(elm).find("a").attr("href");
					urls.push(url);
				});

			//Combining urls to chapter data.
			for (let i = 0; i < chapters.length; i++) {
				chapters[i].url = urls[i];
			}

			//Organizing description and chapters data.
			temp_desc = [temp_desc];
			chapters = [chapters];

			//Combining all data.
			messyData = messyData.concat(tempOne, tempTwo, temp_desc, chapters);

			//Organizing messyData to create a clean Manga object.
			let tempObj = {};
			for (let i = 0; i < messyData.length - 1; i++) {
				tempObj[messyData[i][0]] = messyData[i][1];
			}

			//Organizing tempObj elements.
			tempObj.Alternative = tempObj.Alternative === undefined ? tempObj.Alternative : tempObj.Alternative.split(" ; ");
			tempObj.authors = tempObj.authors === undefined ? tempObj.authors : tempObj.authors.split(" - ");
			tempObj.Genres = tempObj.Genres === undefined ? tempObj.Genres : tempObj.Genres.split(" - ");
			tempObj.View = tempObj.View === undefined ? tempObj.View : parseInt(tempObj.View.replace(/,/g, ""));
			tempObj.Rating = tempObj.Rating === undefined ? tempObj.Rating : tempObj.Rating.split(" - ");
			tempObj.Rating = {
				ratingFromFive: tempObj.Rating[0],
				votes: parseInt(tempObj.Rating[1].replace(/,/g, "")),
			};

			//Creating Manga object.
			let manga = new Manga(
				name,
				temp_cover,
				tempObj.Alternative,
				tempObj.authors,
				tempObj.Status,
				tempObj.Genres,
				tempObj.Updated,
				tempObj.View,
				tempObj.Rating,
				tempObj.Description,
				mangaURL,
				messyData[messyData.length - 1],
			);

			return manga;
		});
	}

	getMangaDataFromID(mangaId) {
		return this.getMangaDataFromURL(`https://manganelo.com/manga/${mangaId}`);
	}

	completeChapterWithPages(chapterInfo) {
		var chapter = new Chapter(chapterInfo.title, chapterInfo.views, chapterInfo.upload_date, chapterInfo.url, chapterInfo.id);

		return axios.get(chapter.url).then(async (res) => {
			let messyData = [];
			const $ = cheerio.load(res.data);

			let tempPages = [];
			await $(".container-chapter-reader")
				.children()
				.each((i, element) => {
					tempPages.push($(element).attr("src"));
				});

			return chapter.fillPages(tempPages);
		});
	}

	getLatestUpdates() {
		return axios.get("https://manganelo.com/").then((res) => {
			const $ = cheerio.load(res.data);

			let mangas = [];
			$(".content-homepage-item").each((i, manga) => {
				var cover = $(manga).find($("img")).attr("src");
				var title = $(manga).find($(".item-title")).text().replace(/\n/g, "");
				var url = $(manga).find($(".item-img")).attr("href");
				var id = url.split("/")[url.split("/").length - 1];

				var chapterUrl = $(manga).find(".item-chapter").first().find("a").attr("href");
				if (!chapterUrl) return;

				var latestChapter = {
					id: chapterUrl.split("/").pop(),
					title: $(manga).find(".item-chapter").first().find("a").text(),
					url: chapterUrl,
					time: $(manga).find(".item-chapter").first().find("i").text(),
				};

				mangas.push({id, title, url, cover, latestChapter});
			});

			return mangas;
		});
	}
}

let mangaScraper = new Scraper();
module.exports = {
	scraper: mangaScraper,
};
