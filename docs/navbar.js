function navActiveClass(paths) {
  if (paths.includes(window.location.pathname.toLocaleLowerCase())) {
    return "active";
  }
}

function renderNavBar() {
  $.get("navbar.mustache", function(templates){
    var navBarHtml = Mustache.render(templates, {
      homeActive: navActiveClass(['/', '/index.html']),
      blockchainActive: navActiveClass(['/ops.html', '/broadcaster.html']),
      apiActive: navActiveClass(['/api.html']),
    });
    jQuery('#navbar').html(navBarHtml);
    $("#navbar .dropdown-trigger").dropdown();
 });
}

jQuery(document).ready(function () {
  renderNavBar();
});
