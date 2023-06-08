
//const bookmarks_url = 'https://tmpfiles.org/1518762/data1.json';

// Search the bookmarks when entering the search keyword.
$('#search').change(function () {
  $('#bookmarks').empty();
  dumpBookmarks($('#search').val());

  console.log('search changed', $('#search').val());


});

// Traverse the bookmark tree, and print the folder and nodes.
function dumpBookmarks(query) {
  const bookmarkTreeNodes = chrome.bookmarks.getTree(function (
    bookmarkTreeNodes
  ) {
    $('#bookmarks').append(dumpTreeNodes(bookmarkTreeNodes, query));
  });
}

function dumpTreeNodes(bookmarkNodes, query) {
  const list = $('<ul>');
  for (let i = 0; i < bookmarkNodes.length; i++) {
    list.append(dumpNode(bookmarkNodes[i], query));
  }

  return list;
}

function dumpNode(bookmarkNode, query) {
  let span = '';
  if (bookmarkNode.title) {
    if (query && !bookmarkNode.children) {
      if (
        String(bookmarkNode.title.toLowerCase()).indexOf(query.toLowerCase()) ==
        -1
      ) {
        return $('<span></span>');
      }
    }

    const anchor = $('<a>');
    anchor.attr('href', bookmarkNode.url);
    anchor.text(bookmarkNode.title);

    /*
     * When clicking on a bookmark in the extension, a new tab is fired with
     * the bookmark url.
     */
    anchor.click(function () {
      chrome.tabs.create({ url: bookmarkNode.url });
    });

    span = $('<span>');
    const options = bookmarkNode.children
      ? $('<span>[<a href="#" id="addlink">Add</a>]</span>')
      : $(
        '<span>[<a id="editlink" href="#">Edit</a> <a id="deletelink" ' +
        'href="#">Delete</a>]</span>'
      );
    const edit = bookmarkNode.children
      ? $(
        '<table><tr><td>Name</td><td>' +
        '<input id="title"></td></tr><tr><td>URL</td><td><input id="url">' +
        '</td></tr></table>'
      )
      : $('<input>');

    // Show add and edit links when hover over.
    span
      .hover(
        function () {
          span.append(options);
          $('#deletelink').click(function (event) {
            console.log(event);
            $('#deletedialog')
              .empty()
              .dialog({
                autoOpen: false,
                closeOnEscape: true,
                title: 'Confirm Deletion',
                modal: true,
                show: 'slide',
                position: {
                  my: 'left',
                  at: 'center',
                  of: event.target.parentElement.parentElement
                },
                buttons: {
                  'Yes, Delete It!': function () {
                    chrome.bookmarks.remove(String(bookmarkNode.id));
                    span.parent().remove();
                    $(this).dialog('destroy');
                  },
                  Cancel: function () {
                    $(this).dialog('destroy');
                  }
                }
              })
              .dialog('open');
          });
          $('#addlink').click(function (event) {
            edit.show();
            $('#adddialog')
              .empty()
              .append(edit)
              .dialog({
                autoOpen: false,
                closeOnEscape: true,
                title: 'Add New Bookmark',
                modal: true,
                show: 'slide',
                position: {
                  my: 'left',
                  at: 'center',
                  of: event.target.parentElement.parentElement
                },
                buttons: {
                  Add: function () {
                    edit.hide();
                    chrome.bookmarks.create({
                      parentId: bookmarkNode.id,
                      title: $('#title').val(),
                      url: $('#url').val()
                    });
                    $('#bookmarks').empty();
                    $(this).dialog('destroy');
                    window.dumpBookmarks();
                  },
                  Cancel: function () {
                    edit.hide();
                    $(this).dialog('destroy');
                  }
                }
              })
              .dialog('open');
          });
          $('#editlink').click(function (event) {
            edit.show();
            edit.val(anchor.text());
            $('#editdialog')
              .empty()
              .append(edit)
              .dialog({
                autoOpen: false,
                closeOnEscape: true,
                title: 'Edit Title',
                modal: true,
                show: 'fade',
                position: {
                  my: 'left',
                  at: 'center',
                  of: event.target.parentElement.parentElement
                },
                buttons: {
                  Save: function () {
                    edit.hide();
                    chrome.bookmarks.update(String(bookmarkNode.id), {
                      title: edit.val()
                    });
                    anchor.text(edit.val());
                    options.show();
                    $(this).dialog('destroy');
                  },
                  Cancel: function () {
                    edit.hide();
                    $(this).dialog('destroy');
                  }
                }
              })
              .dialog('open');
          });
          options.fadeIn();
        },

        // unhover
        function () {
          options.remove();
        }
      )
      .append(anchor);
  }

  const li = $(bookmarkNode.title ? '<li>' : '<div>').append(span);

  if (bookmarkNode.children && bookmarkNode.children.length > 0) {
    li.append(dumpTreeNodes(bookmarkNode.children, query));
  }

  return li;
}

const importedTitle = 'GITHUB-SYNC'

$('#import').click(async () => {
  const response = await chrome.runtime.sendMessage({text: "hey"});
  console.log("Response: ", response);
})

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

function getRemoteBookmarks() {
  const bookmarks_url = 'https://raw.githubusercontent.com/piotrmaj/bookmarks-sync-test/main/data.json';
  return new Promise(function (resolve, reject) {
    var data = { _: new Date().getTime() };
    $.getJSON(bookmarks_url, data, function (data) {
      resolve(data)
    }).fail(function (d, textStatus, error) {
      reject(error);
    });
  });
}

function folderExists(bookmarkTitle) {
  console.log('folderExists', bookmarkTitle)
  var result = chrome.bookmarks.search({ title: bookmarkTitle });
  console.log(result);
  return result;
}

// document.addEventListener('DOMContentLoaded', function () {
//   dumpBookmarks();
// });

