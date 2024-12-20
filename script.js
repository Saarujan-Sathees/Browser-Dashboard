
let contextMenu, root = document.documentElement, cursor, bookmarkContainer;
document.addEventListener("DOMContentLoaded", loadPage);

class ContextMenu {
    menu = null;
    moduleContainer = null
    contextContainer = null;
    CONTEXT_MODULES = { };
    SETTING_MODULES = { };
    DEFAULT_MODULES = { };
    SAVE_STATE = [];
    SETTING_PING = null;
    active = false;
    disabled = false;
    
    async initializeDefaults() {
        document.getElementById("theme-toggle").addEventListener("click", async ev => { 
            if (this.disabled || ev.button != 0) return;
            const scheme = await retrieve("color-scheme");
            const icon = ev.target.id == "theme-toggle" ? ev.target : ev.target.parentElement;

            if (scheme == "dark" || scheme == null) {   //Dark -> Light
                root.style.setProperty('--dashboard', "rgb(238 242 246)");
                root.style.setProperty('--dashboard-secondary', "rgb(48 52 56)");
                root.style.setProperty('--profile', "rgb(232 236 240 / 95%)");
                root.style.setProperty('--widget', "rgb(226 230 234)");
                root.style.setProperty('--text', "rgb(48 52 56)");
                root.style.setProperty('--on-hover', "rgb(218 222 225)");
                root.style.setProperty('--shadow', "rgb(75 75 75 / 25%)");
                root.style.setProperty('--context-menu-item', "rgb(33 37 41 / 15%);");
                this.menu.style.backdropFilter = "blur(8px) brightness(95%)";
                icon.style.transform = "scale(-1, 1)";
                await store("color-scheme", "light");
            } else {                                    //Light -> Dark
                root.style.setProperty('--dashboard', "rgb(33 37 41)");
                root.style.setProperty('--dashboard-secondary', "rgb(226 230 234)");
                root.style.setProperty('--profile', "rgb(39 43 47 / 95%)");
                root.style.setProperty('--widget', "rgb(48 52 56)");
                root.style.setProperty('--text', "rgb(255 255 255)");
                root.style.setProperty('--on-hover', "rgb(53 57 62)");
                root.style.setProperty('--shadow', "rgb(250 250 250 / 18%)");
                root.style.setProperty('--context-menu-item', "rgb(238 242 246 / 15%)");
                this.menu.style.backdropFilter = "blur(8px) brightness(135%)";
                icon.style.transform = "";
                await store("color-scheme", "dark");
            }
        });

        const colorScheme = await retrieve("color-scheme");
        if (colorScheme == "light") {
            await store("color-scheme", "dark");
            document.getElementById("theme-toggle").click();
        }

        this.addContextModule("background-change", module => {
            function toHex(r = 0, g = 0, b = 0) {
                return `#${Number(r).toString(16).padStart(2, "0")}${Number(g).toString(16).padStart(2, "0")}` + 
                       `${Number(b).toString(16).padStart(2, "0")}`.toUpperCase();
            }
    
            function onSliderMove(ev) {
                ev.target.style.setProperty("background-color", `rgb(${ev.target.id == "red-slider" ? ev.target.value : 0} 
                                            ${ev.target.id == "green-slider" ? ev.target.value : 0}
                                            ${ev.target.id == "blue-slider" ? ev.target.value : 0})`, "important");
            
                let red = document.getElementById("red-slider").value,
                    green = document.getElementById("green-slider").value,
                    blue = document.getElementById("blue-slider").value;
    
                root.style.setProperty('--accent', `${red} ${green} ${blue}`);
                hexDisplay.textContent = toHex(red, green, blue);
                store("accent-color", `${red} ${green} ${blue}`);
            }
    
            function onSliderUp(ev) {
                window.removeEventListener("pointermove", onSliderMove);
                window.removeEventListener("pointerup", onSliderUp);
                onSliderMove(ev);
            }
    
            let accent = getComputedStyle(root).getPropertyValue("--accent").split(' ');
            const hexDisplay = document.createElement("pre");
            hexDisplay.classList.add("hoverable");
            hexDisplay.textContent = toHex(accent[0], accent[1], accent[2]);
            hexDisplay.style = `font-family: system-ui; font-weight: 600; font-size: 18px; color: var(--text); padding: 0;
                                margin: 0 10vw; background-color: transparent !important; transition: color 200ms ease-in`;
                                
            hexDisplay.addEventListener("click", () => {
                hexDisplay.animate([{ color: "var(--text)", easing: "cubic-bezier(0, 0, 0.2, 1)" }, { color: "rgb(var(--accent))", 
                                      offset: 0.6, easing: "cubic-bezier(0, 0, 0.2, 1)" }, { color: "var(--text)", 
                                      easing: "cubic-bezier(0, 0, 0.2, 1)" }], 650); 
                navigator.clipboard.writeText(hexDisplay.textContent);
            });
    
            let colours = [ "red", "green", "blue" ], slider = [];
            for (let i = 0; i < 3; ++i) {
                slider[i] = document.createElement("input");
                slider[i].type = "range";
                slider[i].min = "0";
                slider[i].max = "255";
                slider[i].value = +accent[i];
                slider[i].id = colours[i] + "-slider";
                slider[i].classList.add("context-slider", "hoverable");
                slider[i].style.setProperty("background-color", i == 0 ? `rgb(${accent[i]} 0 0)` : 
                                            i == 1 ? `rgb(0 ${accent[i]} 0)` : `rgb(0 0 ${accent[i]})`, "important");
                slider[i].addEventListener("pointerdown", () => {
                    window.addEventListener("pointerup", onSliderUp);
                    window.addEventListener("pointermove", onSliderMove);
                });
    
                module.appendChild(slider[i]);
            }
    
            module.appendChild(hexDisplay);
            return module;
        }, true);

        document.getElementById("context-back").addEventListener("click", () => {
            if (this.SAVE_STATE.length == 0) return;

            const state = this.SAVE_STATE.pop();
            if (state.container == "module") {
                this.moduleContainer.innerHTML = "";
                if (state.element != null) this.moduleContainer.appendChild(state.element);
            } else {
                this.contextContainer.innerHTML = "";
                this.contextContainer.appendChild(state.element);
            }
        });
    }

    handler(ev) {
        if (this.disabled) return;
        const containsBookmark = ev.target.classList.contains("bookmark");
        if (ev.target.id == "bookmark-container" || (containsBookmark && bookmarkContainer.dataset.editable == "false")) {
            handleBookmarkDrag();
            if (!this.active) return;
        } else if (containsBookmark && bookmarkContainer.dataset.editable == "true") {
            return;
        } else if (bookmarkContainer.dataset.editable == "true") {
            handleBookmarkDrag();
            return;
        }
        
        if (this.active) {
            this.active = false;
            this.menu.style.transform = "";
        } else {
            this.active = true;
            this.menu.style.transform = "translateY(-38vh)";
            this.moduleContainer.innerHTML = "";
            this.contextContainer.innerHTML = "";
            if (this.SETTING_PING != null) {
                this.contextContainer.appendChild(this.SETTING_MODULES[this.SETTING_PING]);
                this.SETTING_PING = null;
                this.SAVE_STATE.push({ container: "context", element: this.SETTING_MODULES[this.SETTING_PING] });
            }
            
            for (let i = 0; i < bookmarkContainer.childElementCount; ++i) {
                if (bookmarkContainer.children[i].dataset.active == "true") hideBookmarkDropMenu(bookmarkContainer.children[i].id);
            }
        }
    }

    constructor() {
        this.menu = document.getElementById("context-menu");
        this.moduleContainer = document.getElementById("contextModuleContainer");
        this.contextContainer = document.getElementById("settingsModuleContainer");

        document.body.addEventListener("contextmenu", e => { e.preventDefault() });
        
        document.body.addEventListener("contextmenu", ev => {
            this.handler(ev);
        });

        document.body.addEventListener("click", e => {
            if (this.active == false) return;
    
            if (e.target.id != "context-menu" && !this.menu.contains(e.target)) {
                this.menu.style.transform = "";
                this.active = false;
                this.SAVE_STATE = [];
            }
        });
    }

    addContextModule(id, initializer, isDefaultSetting = false) {
        let module = document.createElement("div");
        module.classList.add("context-module");

        if (isDefaultSetting) {
            let button = document.getElementById(id);       //FIX ID SO THE BUTTON ID DOESN'T FOLLOW THE STYLE OF OTHERS
            button.dataset.moduleID = id;
            module.id = `default-module-${id}`;
            this.DEFAULT_MODULES[id] = initializer(module);

            document.getElementById(id).addEventListener("click", ev => {
                if (this.disabled || ev.button != 0 || this.DEFAULT_MODULES[ev.currentTarget.dataset.moduleID].parentElement != null)
                    return;

                if (this.moduleContainer.innerHTML.length > 0) 
                    this.SAVE_STATE.push({ container: "module", element: this.moduleContainer.firstElementChild });
                else 
                    this.SAVE_STATE.push({ container: "module", element: null });

                this.moduleContainer.innerHTML = "";
                this.moduleContainer.appendChild(this.DEFAULT_MODULES[ev.currentTarget.dataset.moduleID]);
            });
        } else {
            module.id = `context-module-${id}`;
            CONTEXT_MODULES[id] = initializer(module);
        }
    }

    addSettingModule(id, triggerID) {
        let triggerElement = document.getElementById(triggerID);
        this.SETTING_MODULES[id] = document.createElement("div");
        this.SETTING_MODULES[id].id = `setting-module-${id}`;
        this.SETTING_MODULES[id].classList.add("setting-module");
        this.SETTING_MODULES[id].dataset.buttonCount = 0;
        triggerElement.dataset.contextID = id;
        triggerElement.classList.add("contextAvailable");

        const BUTTON_PLACEHOLDER = document.createElement("div");
        BUTTON_PLACEHOLDER.classList.add("context-button", "hoverable");
        BUTTON_PLACEHOLDER.style = `visibility: hidden; background: rgb(var(--accent) / 35%)`;

        for (let i = 0; i < 6; ++i) {
            let placeholder = BUTTON_PLACEHOLDER.cloneNode();
            this.SETTING_MODULES[id].appendChild(placeholder);
        }

        document.getElementById(triggerID).addEventListener("contextmenu", ev => {
            if (!this.active) this.SETTING_PING = ev.currentTarget.dataset.contextID;
        });
    }

    addSettingButton(settingModuleID, id, iconInitializer, callback = null) {
        if (this.SETTING_MODULES[settingModuleID] == undefined || +this.SETTING_MODULES[settingModuleID].dataset.buttonCount > 6) 
            return;

        let button = this.SETTING_MODULES[settingModuleID].children[+this.SETTING_MODULES[settingModuleID].dataset.buttonCount];
        this.SETTING_MODULES[settingModuleID].dataset.buttonCount = +this.SETTING_MODULES[settingModuleID].dataset.buttonCount + 1;
        button.id = `${settingModuleID}-setting-${id}`;
        button.dataset.moduleID = id;
        button.style.visibility = "";

        let buttonIcon = iconInitializer(document.createElement("pre"));
        button.appendChild(buttonIcon);

        if (callback != null && this.CONTEXT_MODULES[id] == undefined) {    //No Context Module
            button.addEventListener("click", ev => {
                if (this.disabled || ev.button != 0) return;
                callback(ev);
            });
        } else {                                                            //Context Module
            button.addEventListener("click", ev => {
                if (this.disabled || ev.button != 0 || this.CONTEXT_MODULES[ev.currentTarget.dataset.moduleID] != null) return;
                if (this.moduleContainer.innerHTML.length > 0) 
                    this.SAVE_STATE.push({ container: "module", element: this.moduleContainer.firstElementChild });
                else 
                    this.SAVE_STATE.push({ container: "module", element: null });

                this.moduleContainer.innerHTML = "";
                this.moduleContainer.appendChild(this.CONTEXT_MODULES[ev.currentTarget.dataset.moduleID]);
            });
        }
    }

    enableMenu() {
        this.disabled = false;
    }

    disableMenu() {
        this.disabled = true;
    }
}

//#region Helper Functions
function measureText(text, weight, family, size) {
	let  canvas = document.createElement('canvas');
	let context = canvas.getContext("2d");
	context.font = weight + " " + family + " " + size;
	return context.measureText(text).width;
}

function convertDate(date) {
    return new Date(Date.parse(date.trim()));
}

function swapElements(a, b) {
    let temp = document.createElement("div");
    a.parentNode.insertBefore(temp, a);
    b.parentNode.insertBefore(a, b);
    temp.parentNode.insertBefore(b, temp);
    temp.parentNode.removeChild(temp);
}

async function store(key, value) {
    await chrome.storage.local.set({ [key]: value });
}

async function retrieve(key) {
    let res = await chrome.storage.local.get([key]);
    return res[key];
}

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

//#endregion

//#region Movie Functions
function handleMovieData(request) {
	let data = request.data, widget = document.getElementById("einthusan-widget"), movieID = 0;

	while (data.indexOf("<h2>") != -1) {
		data = data.substring(data.indexOf(`href`, data.indexOf(`block1`)) + 6);
		
		let container = document.createElement("div");
		container.id = "movie-" + (++movieID);
        container.dataset.redirect = "https://einthusan.tv" + data.substring(0, data.indexOf('"'));
		container.onclick = () => { redirect(container.dataset.redirect); };
		container.classList.add("movie-container", "hoverable");
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
}

async function movieLoop() {
	let widget = document.getElementById("einthusan-widget"), index = 1, curr = null, 
		count = document.getElementById("einthusan-widget").childElementCount;

	while (1) {
		await new Promise(r => setTimeout(r, 3500));
		curr = document.getElementById("movie-" + index);
		curr.style.height = "0";
		if (++index > count) 
		index = 1;
		
		document.getElementById("movie-" + index).style.marginTop = "0";
		await new Promise(r => setTimeout(r, 1000));
		widget.appendChild(curr);
		curr.style.marginTop = "";
		curr.style.height = "";
	}
}

//#endregion

//#region Email Functions
function handleEmailData(request) {
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
			subject = res[i].value.replaceAll(String.fromCharCode(13), "").replaceAll("[External Sender] ", "")
								  .replaceAll("\n", " ");
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
    emailElement.dataset.redirect = "https://mail.google.com/mail/u/0/?zx=hogwnki6gehl#inbox/" + request.id;
    emailElement.onclick = () => { redirect(emailElement.dataset.redirect); };
	emailElement.classList.add("email", "hoverable");

	if (request.isLastEmail) 
		emailElement.style.borderBottom = "none";
	
	document.getElementById("email-widget").appendChild(emailElement);
	let fromEl = document.createElement("pre"), subEl = document.createElement("pre"), originalLength = subject.length;
	fromEl.className = "email-text";
	subEl.className = "email-text";
	fromEl.style.width = "5vw";

	while (measureText(subject, "500", "system-ui", "12px") > 135) {
		subject = subject.substring(0, subject.length - 1);
	}

	fromEl.innerText = from + "\t\t";
	subEl.innerText = subject.trim() + (originalLength != subject.length ? "..." : "");

	emailElement.appendChild(fromEl);
	emailElement.appendChild(subEl);
}

//#endregion

//#region Weather Functions
function handleWeatherData(request) {
	let data = request.data, widget = document.getElementById("weather-widget");

	widget.classList.add("hoverable");
	widget.addEventListener("click", () => {
		redirect("https://www.google.com/search?q=weather"); 
	});

	let weather = document.createElement("pre");
	weather.style = "margin: 0; font-family: system-ui; font-size: 1.75vh; font-weight: 400; color: var(--text);";
    
	let temp = document.createElement("pre");
	temp.style = "margin: 0; font-family: system-ui; font-size: 5vh; font-weight: 600; color: rgb(var(--accent));";
	temp.textContent = data.substring(0, data.indexOf("<")).trim() + " °C";

    data = data.substring(data.indexOf(">", data.indexOf("wob_dc\"")) + 1);

	const weatherStr = data.substring(0, data.indexOf('<'));
	weather.textContent = weatherStr[0];

	for (let i = 0; i < weatherStr.length - 1; ++i) {
		if (weatherStr[i] == ' ') 
			weather.textContent += String.fromCharCode(weatherStr.charCodeAt(i + 1) - 32);
		else 
			weather.textContent += weatherStr[i + 1];
	}
	
	let icon = document.createElement("span");
	icon.className = "material-symbols-rounded";
	icon.style = "width: 12vh; margin: 2vh 3vh; font-size: 12vh; color: var(--text);";

	switch (weather.textContent.toLowerCase()) {
		case "snow": icon.textContent = "snowing"; break;
		case "freezing rain": icon.textContent = "weather_hail"; break;
		default: icon.textContent = weather.textContent.toLowerCase().split(" ").pop();
	}

    switch (icon.textContent) {
        case "showers": icon.textContent = "shower"; break;
        default: icon.textContent = "cloud"; break;
    }

	widget.appendChild(temp);
	widget.appendChild(weather);
	widget.appendChild(icon);
}

//#endregion

const MONTHS = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
chrome.runtime.onMessage.addListener((request, sender, response) => {
	if (request.emailData) {
		handleEmailData(request);
	} else if (request.einthusanData) {
		handleMovieData(request);
		movieLoop();
	} else if (request.weatherData) {
		handleWeatherData(request);
	}
});

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
				window.location = `https://google.com/search?q=${e.target.value.replace(' ', '+')}`;
			} else if (e.target.value.indexOf("C://") == -1 && e.target.value.indexOf("file://") == -1) { //Going to URL
				window.location = "https://" + e.target.value;
			} else { //Going to local file
				window.location = e.target.value;
			}
		}
	});
}

//#region Cursor
function moveCursor(ev) {
    cursor.style.display = "";
    cursor.style.translate = `${ev.clientX - 12}px ${ev.clientY - 12}px`;
}

async function cursorClick() {
    if (cursor.dataset.clicked == "true") return;
    cursor.dataset.clicked = "true";
    cursor.style.animation = "ripple-cursor 700ms ease";
    await new Promise(r => setTimeout(r, 700));
    cursor.style.animation = "";
    cursor.dataset.clicked = "false";
}

//#endregion

//#region Bookmarks
function hideBookmarkDropMenu(elID) {
    document.getElementById(`${elID}-dropdown`).style = "opacity: 0; height: 0px";
    document.getElementById(`${elID}-drop-icon`).style.rotate = "";
    let currBookmark = document.getElementById(elID);
    currBookmark.classList.add("hoverable");
    currBookmark.style.backgroundColor = "";
    currBookmark.dataset.active = false;
    currBookmark.style.borderRadius = "";
}

function handleBookmarkDrag() {
    let bookmarks = bookmarkContainer.children, placeholder, dragged, elOffset, mouseOffset, prevMark, nextMark;

    function getBoundaries() {
        if (placeholder.previousElementSibling != null) {
            const prevPos = placeholder.previousElementSibling.getBoundingClientRect();
            prevMark = prevPos.left;
        } else {
            prevMark = -1e8;
        }

        if (placeholder.nextElementSibling != null) {
            const nextPos = placeholder.nextElementSibling.getBoundingClientRect();
            nextMark = nextPos.left - nextPos.width;
        } else {
            nextMark = 1e8;
        }
    }

    function onDragMove(e) {
        elOffset += e.clientX - mouseOffset;
        mouseOffset = e.clientX;
        dragged.style.translate = `${elOffset}px 0`;

        if (elOffset <= prevMark) {
            swapElements(placeholder, placeholder.previousElementSibling);
            getBoundaries();
        } else if (elOffset >= nextMark) {
            swapElements(placeholder, placeholder.nextElementSibling);
            getBoundaries();
        }
    }

    function onDragStart(e = new PointerEvent()) {
        if (e.button != 0) return;
        shift = 0;
        document.body.style.pointerEvents = "none";
        contextMenu.disableMenu();
        placeholder = this;
        dragged = placeholder.cloneNode(true);
        dragged.classList.add("dragged");
        placeholder.classList.add("placeholder");

        const pos = placeholder.getBoundingClientRect();
        mouseOffset = e.clientX;
        elOffset = pos.left - pos.width / 2 - 8;
        dragged.style.translate = `${elOffset}px 0`;
        placeholder.parentElement.appendChild(dragged);
        getBoundaries();

        window.addEventListener("pointerup", onDragEnd);
        window.addEventListener("pointermove", onDragMove, { passive: true });
    }

    function onDragEnd(e) {
        if (e.button != 0) return;
        document.body.style.pointerEvents = "";
        contextMenu.enableMenu();
        placeholder.classList.remove("placeholder");
        placeholder.parentElement.removeChild(dragged);
        
        window.removeEventListener("pointerup", onDragEnd);
        window.removeEventListener("pointermove", onDragMove, { passive: true });
    }

    for (let i = 0; i < bookmarkContainer.childElementCount; ++i) {
        if (bookmarkContainer.children[i].dataset.active == "true") hideBookmarkDropMenu(bookmarkContainer.children[i].id);
    }

    if (bookmarkContainer.dataset.editable == "true") {
        bookmarkContainer.dataset.editable = "false";
        for (let i = 0; i < bookmarks.length; ++i) {
            bookmarks[i].onpointerdown = null;
            bookmarks[i].classList.remove("bookmark-draggable");
            for (let i = 0; i < bookmarks.length; ++i) {
                bookmarks[i].dataset.pos = i;
                chrome.bookmarks.move(bookmarks[i].dataset.browserID, { index: i });
            }
        }
    } else {
        bookmarkContainer.dataset.editable = "true";
        for (let i = 0; i < bookmarks.length; ++i) {
            bookmarks[i].onpointerdown = onDragStart;
            bookmarks[i].classList.add("bookmark-draggable");
        }
    }
}

async function loadBookmarks() {
	let bookmarks = await chrome.bookmarks.getTree(), curr;
    bookmarkContainer = document.getElementById("bookmark-container");
    const dropIcon = document.createElement("span");
    dropIcon.classList.add("material-symbols-rounded", "bookmarkFolderIcon");
    dropIcon.textContent = "keyboard_arrow_down";

    const title = document.createElement("span");
    title.style = "overflow: hidden; white-space: nowrap; text-overflow: ellipsis";

    const dropMenu = document.createElement("ul");
    dropMenu.classList.add("bookmark-dropdown");
    dropMenu.style = "height: 0px; opacity: 0";

    const SUB_BOOKMARK = document.createElement("li");
    SUB_BOOKMARK.classList.add("sub-bookmark");
    
    const SUB_BOOKMARK_TITLE = document.createElement("p");
    SUB_BOOKMARK_TITLE.style = `overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin: 0;`;

    function processSubFolders(menu, folder, level = 1) {
        if (folder.children.length == 0) { //Empty Folder
            let filler = SUB_BOOKMARK.cloneNode();
            filler.style = `background: transparent !important; padding-left: ${level + 1}vw`;
            menu.appendChild(filler);
            return;
        }

        for (let i = 0; i < folder.children.length; ++i) {
            let bookmark = SUB_BOOKMARK.cloneNode(), title = SUB_BOOKMARK_TITLE.cloneNode();
            title.textContent = folder.children[i].title;
            bookmark.appendChild(title);
            bookmark.style.paddingLeft = `${level}vw`;

            if (folder.children[i].url) { //Bookmark
                bookmark.classList.add("hoverable");
                bookmark.dataset.redirect = folder.children[i].url;
                bookmark.addEventListener("click", ev => {
                    redirect(ev.currentTarget.dataset.redirect);
                });
                menu.appendChild(bookmark);
            } else { //Folder
                title.style.fontWeight = "500";
                bookmark.style.backgroundColor = "transparent";
                menu.appendChild(bookmark);
                processSubFolders(menu, folder.children[i], level + 1);
            }
        }
    }

    for (let i = 0; i < bookmarks[0].children.length; ++i) {
        if (bookmarks[0].children[i].title == "Bookmarks bar") {
            bookmarks = bookmarks[0].children[i].children;
            break;
        }
    }

    for (let i = 0; i < bookmarks.length; ++i) {
        curr = document.createElement("div");
        curr.classList.add("bookmark", "hoverable");
        curr.dataset.browserID = bookmarks[i].id;
        curr.dataset.pos = i;
        curr.id = `browser-bookmark-${i + 1}`;

        let currTitle = title.cloneNode();
        currTitle.textContent = bookmarks[i].title;
        currTitle.id = `${curr.id}-title`;
        curr.appendChild(currTitle);

        if (bookmarks[i].url) {
            curr.dataset.redirect = bookmarks[i].url;
            curr.addEventListener("click", () => {
                redirect(curr.dataset.redirect);
            });
        } else {
            let icon = dropIcon.cloneNode(true);
            icon.id = `${curr.id}-drop-icon`;
            curr.appendChild(icon);
            curr.dataset.active = false;

            let menu = dropMenu.cloneNode(true);
            menu.id = `${curr.id}-dropdown`;
            curr.appendChild(menu);
            processSubFolders(menu, bookmarks[i]);
            if (menu.lastChild) {
                menu.lastChild.style.borderBottom = "none";
                menu.lastChild.style.borderRadius = "0 15px 15px";
            }

            curr.addEventListener("click", e => {
                if (bookmarkContainer.dataset.editable == "true") return;
                const id = e.currentTarget.id, drop = document.getElementById(`${id}-dropdown`);

                if (drop.parentElement.dataset.active == "false") {
                    drop.style.opacity = 1;
                    drop.style.height = "";
                    drop.parentElement.dataset.active = true;
                    drop.parentElement.classList.remove("hoverable");
                    drop.parentElement.style.borderRadius = "15px 15px 0 0";
                    drop.parentElement.style.backgroundColor = "var(--widget) !important";
                    document.getElementById(`${id}-drop-icon`).style.rotate = "180deg";
                } else {
                    hideBookmarkDropMenu(id);
                }
            });
        }

        bookmarkContainer.appendChild(curr);
    }

    function onNonMenuClick(ev) {
        for (let i = 0; i < bookmarkContainer.childElementCount; ++i) {
            let bookmark = bookmarkContainer.children[i];
            if (bookmark.dataset.active == "true" && ev.target.id.indexOf(bookmark.id) == -1) hideBookmarkDropMenu(bookmark.id);
        }
    }

    window.addEventListener("click", onNonMenuClick);
}

//#endregion


async function loadPage() {
    let bgImage = await retrieve("background-image"), accentColor = await retrieve("accent-color");
    root.style.setProperty("--accent", accentColor);
    
    contextMenu = new ContextMenu();
    await contextMenu.initializeDefaults();
    cursor = document.getElementById("cursor");
    document.addEventListener("pointermove", moveCursor);
    document.addEventListener("pointerdown", cursorClick);

    if (bgImage == "no_image") {
        document.body.style.backgroundColor = "var(--widget)";
    } else {
        document.body.style.backgroundImage = `url(${bgImage})`;
    }

    loadClock();
    loadBattery();
    loadApplets();
    loadSearchBar();
    await loadBookmarks();
	backgroundLoop();
}

async function loadApplets() {
    const prefix = "https://www.google.com/s2/favicons?sz=128&domain_url=";
	let appletContainer = document.getElementById("applet-container");
    for (let i = 0; i < appletContainer.childElementCount; ++i) {
        appletContainer.children.item(i).addEventListener("click", ev => {
            if (ev.button != 0) return;
            redirect(appletContainer.children.item(i).dataset.redirect);
        });

        if (appletContainer.children.item(i).src != null)
            appletContainer.children.item(i).src = prefix + appletContainer.children.item(i).dataset.redirect;
    }

    contextMenu = new ContextMenu()
    contextMenu.addSettingModule("applet", appletContainer.id);
    contextMenu.addSettingButton("applet", "edit-app", icon => {
        icon.style = "scale: 0.8; line-height: 10vh; margin-bottom: 57px;";
        icon.textContent = "✎";
        return icon;
    }, () => alert("Clicked"));
}

async function loadClock() {
    let time = document.createElement("pre"), amOrPm = document.createElement("pre");
    time.style = "font-family: system-ui; font-size: 7vh; font-weight: 600; color: var(--text);";
    time.id = "clock-widget-time";
    amOrPm.style = "font-family: system-ui; font-size: 7vh; font-weight: 600; color: rgb(var(--accent));";
    amOrPm.id = "clock-widget-indicator";

    document.getElementById("clock-widget").appendChild(time);
    document.getElementById("clock-widget").appendChild(amOrPm);
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
        battery.text.textContent = Math.round(battery.info.level * 100).toFixed(0) + "%";
        battery.widget.style.setProperty("--percentage", `${battery.info.level * 100}%`);
        //#endregion

		await new Promise(r => setTimeout(r, 60000));
    }
}
