$('#import').click(async () => {
  const response = await chrome.runtime.sendMessage({text: "hey"});
  console.log("Response: ", response);
})