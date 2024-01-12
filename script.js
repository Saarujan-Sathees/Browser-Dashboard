let contextMenu, currentDragOffset, currentDrag, placeholder, bookmarksEditable = false, contextDisplayed = false, 
	backgroundSettings = false, root = document.documentElement, cursor, cursorRippling = false;
let contextMenuStyle = "backdrop-filter: blur(8px) brightness(115%);";

document.addEventListener("DOMContentLoaded", loadPage);

function measureText(text, weight, family, size) {
	let  canvas = document.createElement('canvas');
	let context = canvas.getContext("2d");
	context.font = weight + " " + family + " " + size;
	return context.measureText(text).width;
}

function convertDate(date) {
    return new Date(Date.parse(date.trim()));
}

async function store(key, value) {
    await chrome.storage.local.set({ [key]: value });
}

async function retrieve(key) {
    let res = await chrome.storage.local.get([key]);
    return res[key];
}

const MONTHS = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Nov", "Dec" ];
const SPACESTRING = "                ";
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
        profilePic.addEventListener("click", async () => {
            let device = await navigator.bluetooth.requestDevice({ 
                acceptAllDevices: true
            });

            const server = await device.gatt.connect();
            console.log(device.gatt.device.name);
        })
    
	} else {
		let res = request.res, date, subject, from, dateFound = false, dateInfo;
		
		for (let i = 0; i < res.length; ++i) {
			if (res[i].name == "Received" && !dateFound) {
                dateFound = true;
                dateInfo = convertDate(res[i].value.substring(res[i].value.indexOf(',') + 1));
                
				if (dateInfo.getDate() == new Date().getDate()) { //Today
					let hour = dateInfo.getHours();
					date = ':' + `${dateInfo.getMinutes()}`.padStart(2, 0);
					if (hour < 12) 
						date = hour + date + " AM";
					else if (hour % 24 == 0) 
						date = 12 + date + " AM";
                    else if (hour == 12)
                        date = 12 + date + " PM";
					else if (hour > 12) 
						date = (hour - 12) + date + " PM";
				} else { //More than a day old
					date = MONTHS[dateInfo.getMonth()] + ' ' + dateInfo.getDate(); 
				}
			} else if (res[i].name == "Subject") {
				subject = res[i].value.replaceAll("\n", "").replaceAll("[External Sender] ", "");
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
                if (from.length == 0) from = res[i].value;
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
		let fromEl = document.createElement("pre"), subEl = document.createElement("pre"), originalLength = subject.length;
        fromEl.className = "email-text";
        subEl.className = "email-text";
        fromEl.style.width = "5vw";

		while (measureText(subject, "500", "system-ui", "12px") >= 140) {
			subject = subject.substring(0, subject.length - 1);
		}

        fromEl.innerText = from;
		subEl.innerText = subject + (originalLength != subject.length ? "..." : "");

		emailElement.appendChild(fromEl);
        emailElement.appendChild(subEl);
	}
});


async function redirect(link) {
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

function toggleTheme(ev, specific = null) {
	let btn = document.getElementById("theme-toggle");
	if (specific == "light" || (specific == null && getComputedStyle(root).getPropertyValue('--dashboard').trim() == "rgb(33 37 41)")) { //Dark -> Light
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
        store("color-scheme", "light");
	} else {																				 //Light -> Dark
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
        store("color-scheme", "dark");
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
        store("accent-color", `rgb(${red} ${green} ${blue})`);
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

function moveCursor(ev) {
    cursor.style.display = "";
    cursor.style.translate = `${ev.clientX - 12}px ${ev.clientY - 12}px`;
}

async function cursorClick(ev) {
    if (cursorRippling) return;
    cursorRippling = true;
    cursor.style.animation = "ripple-cursor 700ms ease";
    await new Promise(r => setTimeout(r, 700));
    cursor.style.animation = "";
    cursorRippling = false;
}

function onHover(ev) {
    cursor.style.scale = "130%";
    ev.target.addEventListener("mouseleave", exitHover);
}

function exitHover(ev) {
    cursor.style.scale = "";
    ev.target.removeEventListener("mouseleave", exitHover);
}


function loadContextMenu() {
    arr = document.getElementsByClassName("context-button");
    for (let i = 0; i < arr.length; ++i) {
        arr.item(i).addEventListener("mouseover", onHover);
    }
}

function fixBookmarks() {
	window.removeEventListener("mousemove", horizontalDrag);
	window.removeEventListener("mouseup", fixBookmarks);
	placeholder.style = "";
	if (placeholder.parentElement.contains(currentDrag))
		placeholder.parentElement.removeChild(currentDrag);
}

function onBookmarkDrag(e) {
	currentDrag = e.target.cloneNode();
	currentDrag.innerText = e.target.innerText;
    currentDrag.classList.add("bookmark-dragged");
	e.target.style = "background: transparent; color: transparent; pointer-events: none";
	e.target.parentElement.appendChild(currentDrag);
	placeholder = e.target;
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

async function loadPage() {
    cursor = document.getElementById("cursor");
    document.addEventListener("mousemove", moveCursor);
    document.addEventListener("mousedown", cursorClick);
    
	contextMenu = document.getElementById("context-menu");
    let bgImage = await retrieve("background-image"), accentColor = await retrieve("accent-color");
        
    toggleTheme(null, await retrieve("color-scheme"));
    if (bgImage == "no_image") {
        document.body.style.backgroundColor = "var(--widget)";
    } else {
        document.body.style.backgroundImage = `url(${bgImage})`;
    }

    root.style.setProperty("--accent", accentColor);
    await fetchEinthusan();
    fetchWeather();
    loadClock();
    loadBattery();
    backgroundLoop();

    loadApplets();
    loadSearchBar();
    await loadEmails();
    await loadBookmarks();
    loadContextMenu();

	//Event Listeners
    document.getElementById("search-bar").addEventListener("mouseover", onHover);
    document.getElementById("einthusan-widget").addEventListener("mouseover", onHover);
	document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
	document.getElementById("background-change").addEventListener("click", changeBackground);
    document.body.addEventListener("contextmenu", async e => {
		e.preventDefault();
		if (e.target.id == "bookmark-container") {
			let bookmarks = document.getElementById("bookmark-container").children;
			if (bookmarksEditable) {
				bookmarksEditable = false;
				for (let i = 0; i < bookmarks.length; ++i) {
                    bookmarks.item(i).classList.remove("bookmark-draggable");
					bookmarks.item(i).removeEventListener("mousedown", onBookmarkDrag);
				}
			} else {
				bookmarksEditable = true;
				for (let i = 0; i < bookmarks.length; ++i) {
                    bookmarks.item(i).classList.add("bookmark-draggable");
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
}

async function loadEmails() {
	let emailContainer = document.getElementById("email-widget");
	while (emailContainer.childElementCount < 5) {
		await new Promise(r => setTimeout(r, 50));
	}

	for (let i = 0; i < emailContainer.childElementCount; ++i) {
        emailContainer.children.item(i).addEventListener("mouseover", onHover);
		emailContainer.children.item(i).addEventListener("click", () => { 
			redirect(emailContainer.children.item(i).getAttribute("name")); 
		});
	}
}

async function loadBookmarks() {
	let bookmarkContainer = document.getElementById("bookmark-container");
	for (let i = 0; i < bookmarkContainer.childElementCount; ++i) {
        bookmarkContainer.children.item(i).addEventListener("mouseover", onHover);
		bookmarkContainer.children.item(i).addEventListener("click", () => {
			redirect(bookmarkContainer.children.item(i).getAttribute("name"));
		});
	}
}

async function loadApplets() {
    const prefix = "https://www.google.com/s2/favicons?sz=128&domain_url=";
	let appletContainer = document.getElementById("applet-container");
    for (let i = 0; i < appletContainer.childElementCount; ++i) {
        appletContainer.children.item(i).addEventListener("mouseover", onHover);
        appletContainer.children.item(i).addEventListener("click", () => {
            redirect(appletContainer.children.item(i).getAttribute("name"));
        });

        if (appletContainer.children.item(i).src != null)
            appletContainer.children.item(i).src = prefix + appletContainer.children.item(i).getAttribute("name");
    }
}

async function loadClock() {
    let time = document.createElement("pre"), amOrPm = document.createElement("pre");
    time.style = "font-family: system-ui; font-size: 7vh; font-weight: 600; color: var(--text);";
    time.id = "clock-widget-time";
    amOrPm.style = "font-family: system-ui; font-size: 7vh; font-weight: 600; color: var(--accent);";
    amOrPm.id = "clock-widget-indicator";

    document.getElementById("clock-widget").appendChild(time);
    document.getElementById("clock-widget").appendChild(amOrPm);
    document.getElementById("clock-widget").addEventListener("mouseover", onHover);
}

async function loadBattery() {
    let batteryWidget = document.getElementById("battery-widget"), batteryLevel = document.createElement("div"),
        batteryText = document.createElement("pre");

    batteryLevel.id = "battery-level";
    batteryText.id = "battery-indicator";
    batteryText.style = `position: fixed; height: 14vh; line-height: 14vh; font-size: 3vh; 
                         font-weight: 600; font-family: system-ui; color: var(--text);`;
    batteryWidget.appendChild(batteryLevel);
    batteryWidget.appendChild(batteryText);
}

async function backgroundLoop() {
    let movie = { widget: document.getElementById("einthusan-widget"), index: 1, curr: null, 
                  count: document.getElementById("einthusan-widget").childElementCount };
    let battery = { widget: document.getElementById("battery-level"), info: null,
                    text: document.getElementById("battery-indicator") };
    let clock = { time: document.getElementById("clock-widget-time"), date: null, hours: null,
                  amOrPm: document.getElementById("clock-widget-indicator") };

    while (1) {
        //#region Clock Loop
        clock.date = new Date(Date.now());
        clock.hours = clock.date.getHours();
        if (clock.hours >= 12) {
            clock.hours = (clock.hours - 1) % 12 + 1; 
            clock.amOrPm.textContent = "PM";
        } else {
            clock.amOrPm.textContent = "AM";
        }

        clock.time.textContent = clock.hours.toString() + ":" + clock.date.getMinutes().toString().padStart(2, '0') + " ";
        //#endregion

        //#region Battery Loop
        battery.info = await navigator.getBattery();
        battery.text.textContent = battery.info.level * 100 + "%";
        battery.widget.style.setProperty("--percentage", `${battery.info.level * 100}%`);
        //#endregion

        //#region Movie Loop
        await new Promise(r => setTimeout(r, 3500));
        movie.curr = document.getElementById("movie-" + movie.index);
        movie.curr.style.height = "0";
        if (++movie.index > movie.count) 
        movie.index = 1;
        
        document.getElementById("movie-" + movie.index).style.marginTop = "0";
        await new Promise(r => setTimeout(r, 1000));
        movie.widget.appendChild(movie.curr);
        movie.curr.style.marginTop = "";
        movie.curr.style.height = "";
        //#endregion
    }
}

async function fetchWeather() {
    let request = new XMLHttpRequest();
	request.onreadystatechange = async function() {
		if (this.readyState == 4 && this.status == 200) {
			let data = this.responseText, widget = document.getElementById("weather-widget");
            widget.addEventListener("click", () => {
                redirect("https://www.google.com/search?q=weather"); 
            });
            
            data = data.substring(data.indexOf("AP7Wnd", data.indexOf("AP7Wnd") + 1) + 8);
            let temp = document.createElement("pre"), tempEndIndex = data.indexOf("C<");
            temp.style = "margin: 0; font-family: system-ui; font-size: 5vh; font-weight: 600; color: var(--accent);";
            temp.textContent = data.substring(data.lastIndexOf(">", tempEndIndex) + 1, tempEndIndex).trim() + " °C";

            data = data.substring(data.indexOf(".m.") + 4);
            let weather = document.createElement("pre"), weatherUnformatted = data.substring(0, data.indexOf("<"));
            weather.style = "margin: 0; font-family: system-ui; font-size: 1.75vh; font-weight: 400; color: var(--text);";
            weather.textContent = weatherUnformatted[0];
            for (let i = 0; i < weatherUnformatted.length - 1; ++i) {
                if (weather.textContent[i] == ' ') 
                    weather.textContent += String.fromCharCode(weatherUnformatted.charCodeAt(i + 1) - 32);
                else
                    weather.textContent += weatherUnformatted[i + 1];
            }

            let icon = document.createElement("span");
            icon.className = "material-icons";
            icon.style = "width: 12vh; margin: 2vh 3vh; font-size: 12vh; color: var(--text);"
            let wordArr = weather.textContent.toLowerCase().split(" ");
            icon.textContent = wordArr[wordArr.length - 1];

            widget.appendChild(temp);
            widget.appendChild(weather);
            widget.appendChild(icon);
            widget.addEventListener("mouseover", onHover);
		}
	};

	request.open("GET", `http://127.0.0.1:2020/weather-fetch`, true);  
	request.send();
}

async function fetchEinthusan() {
    return new Promise(resolve => {
        let request = new XMLHttpRequest();
        request.onreadystatechange = async function() {
            if (this.readyState == 4 && this.status == 200) {
                let data = this.responseText, widget = document.getElementById("einthusan-widget"), movieID = 0;

                while (data.indexOf("<h2>") != -1) {
                    data = data.substring(data.indexOf(`href`, data.indexOf(`block1`)) + 6);
                    
                    let container = document.createElement("div");
                    container.id = "movie-" + (++movieID);
                    container.setAttribute("name", "https://einthusan.tv" + data.substring(0, data.indexOf('"')));
                    container.onclick = () => { redirect(container.getAttribute("name")); };
                    container.classList.add("movie-container");
                    if (movieID == 1) 
                        container.style.marginTop = "0";
            
                    widget.appendChild(container);
                    let img = document.createElement("img");
                    img.classList.add("movie-poster");

                    let startIndex = data.indexOf(`src`) + 5;
                    img.src = "https:" + data.substring(startIndex, data.indexOf(`">`, startIndex));
                    container.appendChild(img);

                    let title = document.createElement("pre");
                    title.classList.add("movie-title");
                    title.textContent = data.substring(data.indexOf("<h2") + 4, data.indexOf("</h2>"));
                    if (title.textContent.length > 14) {
                        let fullTitle = title.textContent;
                        title.textContent = fullTitle.charAt(0);
                        for (let i = 1; i < fullTitle.length; ++i) {
                            if (fullTitle.charAt(i - 1) == ' ')
                                title.textContent += "." + fullTitle.charAt(i);
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

                resolve(movieID);
            }
        };

        request.open("GET", `http://127.0.0.1:2020/movie-fetch`, true);  
        request.send();
    });
}
