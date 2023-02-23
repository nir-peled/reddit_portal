
$(document).ready(() => {
	$(".save-button").click((event) => {
		let button = event.currentTarget;
		let post = $(button).val();

		$.post("/posts/save", {post})
		.done(() => {
			alert("Post Saved");
			$(button).prop("hidden", true);

			let remove_button_name = "#remove-" + post;
			$(remove_button_name).prop("hidden", false);
		});
	}); // .save-button click

	$(".remove-button").click((event) => {
		let button = event.currentTarget;
		let post = $(button).val();

		$.post("/posts/remove", {post})
		.done(() => {
			alert("Post Removed");
			$(button).prop("hidden", true);
			$("#save-" + post).prop("hidden", false)
		});
	}); // .remove-button click
});
