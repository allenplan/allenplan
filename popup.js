/** Opens the Hello World page in a new browser tab. */
function openHelloWorld() {
  chrome.tabs.create({url: chrome.runtime.getURL('hello.html')});
}

document.querySelector('#open-tab').addEventListener('click', openHelloWorld);
