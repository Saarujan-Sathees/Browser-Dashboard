

let contextMenu, currentDragOffset, currentDrag, placeholder, bookmarksEditable = false, contextDisplayed = false, 
	backgroundSettings = false, root = document.documentElement;
let contextMenuStyle = "backdrop-filter: blur(8px) brightness(115%);";

document.addEventListener("DOMContentLoaded", loadBookmarks);

function measureText(text, weight, family, size) {
	
	let  canvas = document.createElement('canvas');
	let context = canvas.getContext("2d");
	context.font = weight + " " + family + " " + size;
	return context.measureText(text).width;
}

chrome.runtime.onMessage.addListener((request, sender, response) => {
	if (request.isProfileData) {
		let response = request.body;
		let text = document.createElement("pre");
		text.style = "font-size: 20px; font-weight: 500; color: var(--text); font-family: system-ui; margin: 8vh 0 0 0; text-align: left;";
		let improperName = String(response["name"]);
		if (improperName.toUpperCase() == improperName) {
			text.innerText = improperName.charAt(0).toUpperCase();
			for (let i = 1; i < improperName.length; ++i) {
				if (improperName.charAt(i - 1) == ' ') 
					text.innerText += improperName.charAt(i).toUpperCase();
				else 
					text.innerText += improperName.charAt(i).toLowerCase();
			}
		} else {
			text.innerText = improperName;
		}
		
		document.getElementById("profile-info").appendChild(text);
		text = document.createElement("pre");
		text.style = `font-size: 16px; font-weight: 300; color: var(--text); font-family: system-ui; 
					  margin: 0.5vh 0 0 0; text-align: left;`;
		text.innerText = response["email"];
		document.getElementById("profile-info").appendChild(text);

		let profilePic = document.createElement("img");
		profilePic.src = response["picture"];
		profilePic.style = "height: 12vh; border-radius: 2vh; float: right; margin-right: 2.5vh; margin-top: -9vh";
		document.getElementById("profile-info").appendChild(profilePic);
	} else {
		let res = request.res, date, subject, from;
		
		for (let i = 0; i < res.length; ++i) {
			if (res[i].name == "Date") {
				date = res[i].value.substring(5, res[i].value.indexOf(' ', 5));
				if (date == (new Date()).getDate().toString()) { //Today
					let hour = +res[i].value.substring(res[i].value.indexOf(':') - 2, res[i].value.indexOf(':'));
					date = res[i].value.substring(res[i].value.indexOf(':'), res[i].value.lastIndexOf(':'));
					if (hour < 12) 
						date = hour + date + " AM";
					else if (hour == 24) 
						date = (hour - 12) + date + " AM";
					else if (hour >= 12) 
						date = (hour - 12) + date + " PM";
				} else { //More than a day old
					date = res[i].value.substring(6 + date.length, 9 + date.length) + " " + (new Date()).getDate(); 
				}
			} else if (res[i].name == "Subject") {
				subject = res[i].value.replaceAll("\n", "");
			} else if (res[i].name == "From") {
				from = res[i].value.substring(res[i].value.indexOf('"') == 0 ? 1 : 0);
				from = from.substring(0, from.indexOf(" (") == -1 ? from.indexOf(" <") : from.indexOf(" ("));
				if (from.toUpperCase() == from) {
					let properFrom = from.charAt(0).toUpperCase();
					for (let j = 1; j < from.length; ++j) {
						if (from.charAt(j - 1) == ' ') 
							properFrom += from.charAt(j).toUpperCase();
						else 
							properFrom += from.charAt(j).toLowerCase();
					}
					from = properFrom;
				}
				
				from = from.substring(0, from.indexOf(' ') == -1 ? undefined : from.indexOf(' '));
				let initialLength = from.length;
				while (measureText(from, "500", "system-ui", "12px") >= 35) {
					from = from.substring(0, from.length - 1);
				}
				
				if (initialLength != from.length) {
					from += "...";
				}
			}
		}
		
		let emailElement = document.createElement("pre");
		emailElement.innerText = date + "\t\t";
		emailElement.setAttribute("name", "https://mail.google.com/mail/u/0/?zx=hogwnki6gehl#inbox/" + request.id);
		
		emailElement.classList.add("email");
		if (request.isLastEmail) 
			emailElement.style.borderBottom = "none";
		
		document.getElementById("email-widget").appendChild(emailElement);
		let subElement = document.createElement("pre"), originalLength = subject.length;

		while (measureText(subject, "500", "system-ui", "12px") >= 140) {
			subject = subject.substring(0, subject.length - 1);
		}

		subElement.innerText = from + "\t\t" + subject + (originalLength != subject.length ? "..." : "");
		subElement.style = "font-family: system-ui; font-weight: 500; font-size: 12px; margin: 0; " + 
							"color: var(--dashboard-secondary);";
		emailElement.appendChild(subElement);
	}
});


async function redirectBookmark(link) {
	let infobar = document.getElementById("info-bar"), widgets = document.getElementById("widget-container"),
		account = document.getElementById("account");

	infobar.style.transition = "left 1.25s cubic-bezier(0.935, -0.08, 0.415, 0.8)";
	widgets.style.transition = "left 1.25s cubic-bezier(0.935, -0.08, 0.415, 0.8)";
	account.style.transition = "right 1.25s cubic-bezier(0.935, -0.08, 0.415, 0.8)";

	infobar.style.left = "100vw";
	widgets.style.left = "100vw";
	account.style.right = "-97vw";

	await new Promise(r => setTimeout(r, 1050));
	window.location = link;
}

function toggleTheme() {
	let btn = document.getElementById("theme-toggle");
	if (getComputedStyle(root).getPropertyValue('--dashboard').trim() == "rgb(33 37 41)") {	 //Dark -> Light
		root.style.setProperty('--dashboard', "rgb(238 242 246)");
		root.style.setProperty('--dashboard-secondary', "rgb(48 52 56)");
		root.style.setProperty('--profile', "rgb(232 236 240 / 95%)");
		root.style.setProperty('--widget', "rgb(226 230 234)");
		root.style.setProperty('--text', "rgb(48 52 56)");
		root.style.setProperty('--on-hover', "rgb(218 222 225)");
		root.style.setProperty('--shadow', "rgb(75 75 75 / 25%)");
		root.style.setProperty('--context-menu-item', "rgb(33 37 41 / 15%);");
		contextMenuStyle = "backdrop-filter: blur(8px) brightness(95%);";
		btn.style.transform = "rotate(180deg)";
	} else {																										//Light -> Dark
		root.style.setProperty('--dashboard', "rgb(33 37 41)");
		root.style.setProperty('--dashboard-secondary', "rgb(226 230 234)");
		root.style.setProperty('--profile', "rgb(39 43 47 / 95%)");
		root.style.setProperty('--widget', "rgb(48 52 56)");
		root.style.setProperty('--text', "rgb(255 255 255)");
		root.style.setProperty('--on-hover', "rgb(53 57 62)");
		root.style.setProperty('--shadow', "rgb(127 127 127 / 70%)");
		root.style.setProperty('--context-menu-item', "rgb(238 242 246 / 15%)");
		contextMenuStyle = "backdrop-filter: blur(8px) brightness(115%);";
		btn.style.transform = "";
	}
}

function removeBackgroundSettings() {
	if (backgroundSettings) {
		backgroundSettings = false;
		contextMenu.removeChild(document.getElementById("red-slider"));
		contextMenu.removeChild(document.getElementById("green-slider"));
		contextMenu.removeChild(document.getElementById("blue-slider"));
		for (let i = 0; i < contextMenu.childElementCount; ++i) {
			contextMenu.children.item(i).style.display = "";
		}
	}
}

async function changeBackground() {
	function onSliderMove(ev) {
		root.style.setProperty("--" + ev.target.id, `rgb(${ev.target.id == "red-slider" ? ev.target.value : 0} 
																				${ev.target.id == "green-slider" ? ev.target.value : 0}
																				${ev.target.id == "blue-slider" ? ev.target.value : 0})`);
	
		let red = document.getElementById("red-slider").value;
		let green = document.getElementById("green-slider").value;
		let blue = document.getElementById("blue-slider").value;

		root.style.setProperty('--accent', `rgb(${red} ${green} ${blue})`);
		if (document.body.style.backgroundImage != "") { 
			document.body.style.backgroundImage = "";
			document.body.style.backgroundColor = "var(--accent)";
		}
	}

	function onSliderUp(ev) {
		window.removeEventListener("pointermove", onSliderMove);
		window.removeEventListener("pointerup", onSliderUp);
		onSliderMove(ev);
	}

	for (let i = 0; i < contextMenu.childElementCount; ++i) {
		contextMenu.children.item(i).style.display = "none";
	}

	let accent = getComputedStyle(root).getPropertyValue("--accent");
	accent = accent.substring(accent.indexOf('(') + 1, accent.indexOf(')')).split(' ');
	root.style.setProperty("--red-slider", `rgb(${accent[0]} 0 0)`);
	root.style.setProperty("--green-slider", `rgb(0 ${accent[1]} 0)`);
	root.style.setProperty("--blue-slider", `rgb(0 0 ${accent[2]})`);

	let colours = [ "red", "green", "blue" ], slider = [];
	for (let i = 0; i < 3; ++i) {
		slider[i] = document.createElement("input");
		slider[i].type = "range";
		slider[i].min = "0";
		slider[i].max = "255";
		slider[i].value = accent[i];
		slider[i].id = colours[i] + "-slider";
		slider[i].classList.add("context-slider");
		slider[i].addEventListener("pointerdown", ()=> {
			window.addEventListener("pointerup", onSliderUp);
			window.addEventListener("pointermove", onSliderMove);
		});
		contextMenu.appendChild(slider[i]);
	}

	
	await new Promise(r => setTimeout(r, 10));
	for (let i = 0; i < 3; ++i) {
		slider[i].style.top = "0";
	}
	backgroundSettings = true;
}

function loadSearchBar() {
	document.getElementById("search-bar").addEventListener("keyup", async e => {
		if (e.key == "Enter") {
			let infobar = document.getElementById("info-bar"), widgets = document.getElementById("widget-container"),
				account = document.getElementById("account");
		
			infobar.style.transition = "top 1.25s cubic-bezier(0.935, -0.08, 0.415, 0.8)";
			account.style.transition = "top 1.25s cubic-bezier(0.935, -0.08, 0.415, 0.8)";
			widgets.style.transition = "bottom 1.25s cubic-bezier(0.935, -0.08, 0.415, 0.8)";
		
			infobar.style.top = "100vh";
			account.style.top = "100vh";
			widgets.style.bottom = "-96vh";

			await new Promise(r => setTimeout(r, 1050));
			if (e.target.value.indexOf(".") == -1 && e.target.value.indexOf("://") == -1) {  //Normal search query
				window.location = `https://${navigator.userAgent.indexOf("Edg") != -1 ? "bing" : "google"}.com/` + 
								  `search?q=${e.target.value.replace(' ', '+')}&rlz=1C1CHBD_enCA724CA727&ie=UTF-8`;
			} else if (e.target.value.indexOf("C://") == -1 && e.target.value.indexOf("file://") == -1){ //Going to specific page using URL
				window.location = "https://" + e.target.value;
			} else { //Going to local file
				window.location = e.target.value;
			}
		}
	});
}

function fixBookmarks() {
	window.removeEventListener("mousemove", horizontalDrag);
	window.removeEventListener("mouseup", fixBookmarks);
	placeholder.style = "background-color: var(--accent); animation: 200ms ease infinite unlocked";
	if (placeholder.parentElement.contains(currentDrag))
		placeholder.parentElement.removeChild(currentDrag);
}

function onBookmarkDrag(e) {
	currentDrag = e.target.cloneNode();
	currentDrag.innerText = e.target.innerText;
	currentDrag.style.pointer = "grabbing";
	e.target.style = "background: var(--dashboard); color: transparent";
	e.target.parentElement.appendChild(currentDrag);
	placeholder = e.target;
	currentDrag.style.position = "absolute";
	currentDrag.style.animation = "";
	currentDragOffset = e.clientX - parseInt(e.target.offsetLeft);

	window.addEventListener("mouseup", fixBookmarks);
	window.addEventListener("mousemove", horizontalDrag);
}

function horizontalDrag(mouse) {
	let rect = currentDrag.getBoundingClientRect(), next = placeholder.nextElementSibling, prev = placeholder.previousElementSibling;
	currentDrag.style.left = (mouse.clientX - currentDragOffset) + "px";
	if (next != null && next.getBoundingClientRect().left < rect.right - 50) { 
		placeholder.parentElement.insertBefore(next, placeholder); 
	}

	if (prev != null && rect.left < prev.getBoundingClientRect().right - 50) {
		placeholder.parentElement.insertBefore(placeholder, prev);
	}
}

async function loadBookmarks() {
	loadSearchBar();
	loadEW();

	//Event Listeners
	document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
	document.getElementById("background-change").addEventListener("click", changeBackground);
	let bookmarkContainer = document.getElementById("bookmark-container");
	for (let i = 0; i < bookmarkContainer.childElementCount; ++i) {
		bookmarkContainer.children.item(i).addEventListener("click", () => {
			redirectBookmark(bookmarkContainer.children.item(i).getAttribute("name"));
		});
	}

	document.body.style.backgroundImage = "url('Background.jpg')";
	contextMenu = document.getElementById("context-menu");
	document.body.addEventListener("contextmenu", async e => {
		e.preventDefault();
		if (e.target.id == "bookmark-container") {
			let bookmarks = document.getElementById("bookmark-container").children;
			if (bookmarksEditable) {
				bookmarksEditable = false;
				for (let i = 0; i < bookmarks.length; ++i) {
					bookmarks.item(i).style.backgroundColor = "";
					bookmarks.item(i).style.animation = "";
					bookmarks.item(i).style.cursor = "";
					bookmarks.item(i).removeEventListener("mousedown", onBookmarkDrag);
				}
			} else {
				bookmarksEditable = true;
				for (let i = 0; i < bookmarks.length; ++i) {
					bookmarks.item(i).style.backgroundColor = "var(--accent)";
					bookmarks.item(i).style.animation = "200ms ease infinite unlocked";
					bookmarks.item(i).style.cursor = "grab";
					bookmarks.item(i).addEventListener("mousedown", onBookmarkDrag);
				}
			}

			contextMenu.style = contextMenuStyle;
			await new Promise(r => setTimeout(r, 1000));
			contextMenu.style = "";
			removeBackgroundSettings();
			contextDisplayed = false;
		} else if (e.target.classList.contains("bookmark") && bookmarksEditable) {
			
		} else {
			if (bookmarksEditable) {
				bookmarksEditable = false;
				let bookmarks = document.getElementById("bookmark-container").children;
				for (let i = 0; i < bookmarks.length; ++i) {
					bookmarks.item(i).style.backgroundColor = "";
					bookmarks.item(i).style.animation = "";
					bookmarks.item(i).style.cursor = "";
					bookmarks.item(i).removeEventListener("mousedown", onBookmarkDrag);
				}
			} else if (contextDisplayed == false) {
				contextDisplayed = true;
				contextMenu.style = "bottom: 0; " + contextMenuStyle;
			} else {
				contextDisplayed = false;
				contextMenu.style = contextMenuStyle;
				await new Promise(r => setTimeout(r, 1000));
				contextMenu.style = "";
				removeBackgroundSettings();
			}
		}
	});

	document.body.addEventListener("click", async e => {
		if (e.target.parentElement.id == "context-menu" || e.target.id == "context-menu" ||
			e.target.parentElement.parentElement.id == "context-menu" && contextMenu.style != "") {
		} else {
			contextMenu.style = contextMenuStyle;
			await new Promise(r => setTimeout(r, 1000));
			contextMenu.style = "";
			removeBackgroundSettings();
		}
	});

	let emailContainer = document.getElementById("email-widget");
	while (emailContainer.childElementCount < 5) {
		await new Promise(r => setTimeout(r, 50));
	}

	for (let i = 0; i < emailContainer.childElementCount; ++i) {
		emailContainer.children.item(i).addEventListener("click", () => { 
			redirectBookmark(emailContainer.children.item(i).getAttribute("name")); 
		});
	}
}

async function loadEW() {
	let request = new XMLHttpRequest();
	request.onreadystatechange = async function() {
		if (this.readyState == 4 && this.status == 200) {
			let data = this.responseText, widget = document.getElementById("einthusan-widget"), movieID = 0;
			while (data.indexOf("<h2>") != -1) {
				data = data.substring(data.indexOf(`<a href="`, data.indexOf("newrelease_tab")) + 9);
				
				let container = document.createElement("div");
				container.id = "movie-" + (++movieID);
				container.setAttribute("name", "https://einthusan.tv" + data.substring(0, data.indexOf('"')));
				container.onclick = () => { redirectBookmark(container.getAttribute("name")); };
				container.classList.add("movie-container");
				if (movieID == 1) 
					container.style.marginTop = "0";
		
				widget.appendChild(container);
				let img = document.createElement("img");
				img.classList.add("movie-poster");
				img.src = "https:" + data.substring(data.indexOf(`src="`) + 5, data.indexOf(`"></a>`));
				container.appendChild(img);

				let title = document.createElement("pre");
				title.classList.add("movie-title");
				title.textContent = data.substring(data.indexOf("<h2>") + 4, data.indexOf("</h2>"));
				if (title.textContent.length > 14) {
					let fullTitle = title.textContent;
					title.textContent = fullTitle.charAt(0);
					for (let i = 1; i < fullTitle.length; ++i) {
						if (fullTitle.charAt(i - 1) == ' ')
							title.textContent += " " + fullTitle.charAt(i);
					}
				}
				container.appendChild(title);

				let rating;
				for (let i = 0; i < 5; ++i) {
					data = data.substring(data.indexOf("data-value") + 12);
					rating = document.createElement("progress");
					rating.classList.add("movie-rating");
					rating.setAttribute("value", data.substring(0, data.indexOf('"')));
					rating.setAttribute("max", "5");
					container.appendChild(rating);
				}		   
			}
			
			let currentMovie = 1, curr;
			await new Promise(r => setTimeout(r, 500));
			while (1) {
				await new Promise(r => setTimeout(r, 3500));
				curr = document.getElementById("movie-" + currentMovie);
				curr.style.height = "0";
				if (++currentMovie > movieID) 
					currentMovie = 1;
				
				document.getElementById("movie-" + currentMovie).style.marginTop = "0";
				await new Promise(r => setTimeout(r, 1000));
				widget.appendChild(curr);
				curr.style.marginTop = "";
				curr.style.height = "";
			}
		}
	};

	request.open("GET", `http://${!navigator.userAgent.indexOf("Edg") != -1 ? "192.168.86.33" : "192.168.2.36"}:2020/movie-fetch`, true);  
	request.send();
}