chrome.runtime.onStartup.addListener(async () => {
  console.log('open');
  await ReImport();
})

chrome.runtime.onMessage.addListener(async function(msg, sender, sendResponse) {
    console.log("Received %o from %o, frame", msg, sender.tab, sender.frameId);
    await ReImport();
    sendResponse("Gotcha!");
});

async function ReImport() {
    const remoteBookmarks = await getRemoteBookmarks();
    console.log('remoteBookmarks', remoteBookmarks);
    const { existingImport, bookmarksBar } = await getExistingImport();
    if (!!existingImport) {
        const removed = await chrome.bookmarks.removeTree(existingImport.id);
        console.log('removed', removed);
    }
    const created = await chrome.bookmarks.create({ parentId: bookmarksBar.id, title: importedTitle, index: 25 });
    console.log('created', created);
    for (const remoteBookmark of remoteBookmarks) {
        await createRecursive(remoteBookmark, created.id);
    }
    await chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "Sync finished!",
        message: `at ${new Date().toISOString()}`,
    });
}


const importedTitle = 'GITHUB-SYNC'

async function createRecursive(node, parentId) {
  const isFolder = !!node.children;
  console.log('isFolder', node);
  if (!isFolder) {
    await chrome.bookmarks.create({ parentId: parentId, title: node.name, url: node.url });
    return;
  }

  const created = await chrome.bookmarks.create({ parentId: parentId, title: node.name });
  var childrenPromises = [];
  node.children.forEach(child => childrenPromises.push(createRecursive(child, created.id)));
  await Promise.all(childrenPromises);
}

async function getExistingImport() {
  const bookmarksBar = await getBookmarksBar();
  const subTreeResult = await chrome.bookmarks.getSubTree(bookmarksBar.id);
  const barSubTree = subTreeResult[0];
  return {
    existingImport: barSubTree.children.find(c => c.title == importedTitle),
    bookmarksBar: bookmarksBar
  };
}

async function getBookmarksBar() {
  let bookmarksBar = await chrome.bookmarks.get('1');
  if (bookmarksBar.length < 1) {
    return null;
  }
  bookmarksBar = bookmarksBar[0];
  if (bookmarksBar.parentId == 0) {
    return bookmarksBar;
  }

  return null;
}

async function getRemoteBookmarks() {
    const bookmarks_url = `https://raw.githubusercontent.com/piotrmaj/bookmarks-sync-test/main/data.json`;
    const response = await fetch(bookmarks_url, { cache: "no-store" });
    const jsonData = await response.json();
    return jsonData;
}
