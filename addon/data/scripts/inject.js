/*
   js from backend to front end
   */

function importCert() {
  self.port.emit("importCert");
}

function export_certs() {
  self.port.emit("export_certs");
}

document.getElementById('import').onclick = function() {
  importCert();
};
document.getElementById('exportButton').onclick = function() {
  export_certs();
};

function listCerts(id) {
  self.port.emit("listCerts", id);
}

function editCertTrust(auth, cert, ssl, email, objsign) {
  self.port.emit("editCertTrust", auth, cert, ssl, email, objsign);
}

function distrustAuth(id) {
  self.port.emit("distrustAuth", id);
}

function entrustAuth(id) {
  self.port.emit("entrustAuth", id);
}

self.port.on("reset_table", function reset_table(){
  $("#auth_table tr").remove();
});

/*
   inserts a new certificate into the table.

   the display for each certificate is shown through multiple rows ('tr').
   each row is seperated into different nodes ('td') createing a grid of sorts.

   the each row of the grid has a topic, such as last audit, owner, etc.
   all the rows are only viewed if the user selects the cert, expanding it into detail view.

*/
self.port.on("insert_row", function insert_row(num, source, name, trust, last, country, trustbits, enabled, countryCode, owner) {
  // Making the parent
  var parent = document.createElement('tr');
  parent.className = 'parent parentClosed';
  if (!enabled) {
    parent.className += ' distrustedRow';
  }
  parent.id = 'row'+num;

  var source_node = document.createElement('td');
  source_node.setAttribute('style', 'border-right: 3px dotted #EBECED');

  // node displays icon indicates where the authority comes from. (user added or not)
  var source_image = document.createElement('img');
  source_image.setAttribute('src',(source == "customCert") ? './img/custom-512.png':'./img/firefox-512.png');
  source_image.setAttribute('width','16');
  source_image.setAttribute('height','16');
  source_image.setAttribute('title',source);
  source_node.appendChild(source_image);
  source_node.id = "icon_node";

  // blank node
  var trust_node = document.createElement('td');
  var trust_bar = document.createElement('meter');
  trust_bar.setAttribute('value',trust);
  trust_bar.setAttribute('title',trust);
  trust_bar.setAttribute('max','100');
  trust_bar.setAttribute('min','0');
  trust_bar.setAttribute('low','20');
  trust_bar.setAttribute('high','80');
  trust_bar.setAttribute('optimum','90');
  trust_node.appendChild(trust_bar);

  // name of certificate group
  var name_node = document.createElement('td');
  name_node.setAttribute('style', 'border-right: 3px dotted #EBECED');
  name_node.colSpan = '2';
  name_node.id = 'name'+num;
  var name_text = document.createTextNode(name);
  name_node.appendChild(name_text);

  parent.appendChild(source_node);
  parent.appendChild(name_node);
  parent.appendChild(trust_node);

  // row (1) for last audit.
  var sub1 = document.createElement('tr');
  sub1.style = 'display:none';
  sub1.className = 'detail_row child-row'+num;
  if (!enabled) {
    sub1.className += ' distrustedRow';
  }

  // blank node
  var first_node = document.createElement('td');
  var first_text = document.createTextNode('\t');
  first_node.appendChild(first_text);

  // Last Audit text node
  var middle_node = document.createElement('td');
  // middle_node.setAttribute('width', '10%');
  var middle_text = document.createTextNode('Last Audit: ');
  middle_node.appendChild(middle_text);

  // display date of last audit for certs
  var last_node = document.createElement('td');
  // last_node.setAttribute('width', '90%');
  var last_text = document.createTextNode(last);
  last_node.appendChild(last_text);

  // node for blank end column
  var last_node_for_color = document.createElement('td');
  var last_node_for_color_text = document.createTextNode('\t');
  last_node_for_color.appendChild(last_node_for_color_text);

  sub1.appendChild(first_node);
  sub1.appendChild(middle_node);
  sub1.appendChild(last_node);
  sub1.appendChild(last_node_for_color);

  // row (2) for Geographic focus
  var sub2 = document.createElement('tr');
  sub2.style = 'display:none';
  sub2.className = 'detail_row child-row'+num;
  if (!enabled) {
    sub2.className += ' distrustedRow';
  }

  // blank node 
  first_node = document.createElement('td');
  first_text = document.createTextNode('\t');
  first_node.appendChild(first_text);

  // display country of focus for certs
  middle_node = document.createElement('td');
  // middle_node.setAttribute('width', '10%');
  middle_text = document.createTextNode('Geographic Focus: ');
  middle_node.appendChild(middle_text);

  // blank node
  last_node = document.createElement('td');
  // last_node.setAttribute('width', '90%');
  last_text = document.createTextNode(country);
  last_node.appendChild(last_text);

  // button for distrusting certificates group
  sub2_button = document.createElement('button'); 
  if (enabled) {
    sub2_button.id = 'distrust-'+num;
    sub2_button.className = 'red ui button trustbutton';

    var button_text = document.createTextNode('DISTRUST');
    sub2_button.onclick = function(){
      distrust(num);
    };
  }
  else {
    sub2_button.id = 'entrust-'+num;
    sub2_button.className = 'green ui button trustbutton';
    var button_text = document.createTextNode('TRUST');
    sub2_button.onclick = function(){
      entrust(num);
    };
  }
  sub2_button.appendChild(button_text);

  // blank node
  first_node = document.createElement('td');
  first_text = document.createTextNode('\t');
  first_node.appendChild(first_text);
  var last_node_for_color = document.createElement('td');
  var last_node_for_color_text = document.createTextNode('\t');
  last_node_for_color.appendChild(last_node_for_color_text);

  sub2.appendChild(first_node);
  sub2.appendChild(middle_node);
  sub2.appendChild(last_node);
  sub2.appendChild(last_node_for_color);

  // row (4) for TrustBits
  var sub3 = document.createElement('tr');
  sub3.style = 'display:none';
  sub3.className = 'detail_row child-row'+num;
  if (!enabled) {
    sub3.className += ' distrustedRow';
  }

  // blank node
  first_node = document.createElement('td');
  first_text = document.createTextNode('\t');
  first_node.appendChild(first_text);

  // TrustBits text node
  middle_node = document.createElement('td');
  // middle_node.setAttribute('width', '10%');
  middle_text = document.createTextNode('TrustBits: ');
  middle_node.appendChild(middle_text);

  // display TrustBits (what cert is used for)
  last_node = document.createElement('td');
  // last_node.setAttribute('width', '90%');
  last_text = document.createTextNode(trustbits);
  last_node.appendChild(last_text);

  // blank node
  var last_node_for_color = document.createElement('td');
  var last_node_for_color_text = document.createTextNode('\t');
  last_node_for_color.appendChild(last_node_for_color_text);

  sub3.appendChild(first_node);
  sub3.appendChild(middle_node);
  sub3.appendChild(last_node);
  sub3.appendChild(last_node_for_color);

  // row (3) for owner
  var sub4 = document.createElement('tr');
  sub4.style = 'display:none';
  sub4.className = 'detail_row child-row'+num;
  if (!enabled) {
    sub4.className += ' distrustedRow';
  }

  // blank node
  first_node = document.createElement('td');
  first_text = document.createTextNode('\t');
  first_node.appendChild(first_text);

  // owner text node
  middle_node = document.createElement('td');
  // middle_node.setAttribute('width', '10%');
  middle_text = document.createTextNode('Owner: ');
  middle_node.appendChild(middle_text);

  // display the owner of the cert
  last_node = document.createElement('td');
  // last_node.setAttribute('width', '90%');
  last_text = document.createTextNode(owner);
  last_node.appendChild(last_text);

  // blank node
  var last_node_for_color = document.createElement('td');
  var last_node_for_color_text = document.createTextNode('\t');
  last_node_for_color.appendChild(last_node_for_color_text);

  sub4.appendChild(first_node);
  sub4.appendChild(middle_node);
  sub4.appendChild(last_node);
  sub4.appendChild(last_node_for_color);

  // row (5) for country code
  var sub5 = document.createElement('tr');
  sub5.style = 'display:none';
  sub5.className = 'detail_row child-row'+num;
  if (!enabled) {
    sub5.className += ' distrustedRow';
  }

  // blank node
  first_node = document.createElement('td');
  first_text = document.createTextNode('\t');
  first_node.appendChild(first_text);

  // country code text
  middle_node = document.createElement('td');
  // middle_node.setAttribute('width', '10%');
  middle_text = document.createTextNode('CA Country Code: ');
  middle_node.appendChild(middle_text);

  // display country code
  last_node = document.createElement('td');
  // last_node.setAttribute('width', '90%');
  last_text = document.createTextNode(countryCode);
  last_node.appendChild(last_text);

  // add view certificates button
  sub5_button = document.createElement('button');
  sub5_button.className = 'blue ui button moreButton';
  var button_text = document.createTextNode('VIEW CERTIFICATES');
  sub5_button.appendChild(button_text);
  sub5_button.onclick = function(){
    showDetails(num);
  };
  var distrust_button_node = document.createElement('td');
  var button_div = document.createElement('div');
  button_div.className = "trust_button_div";
  distrust_button_node.setAttribute('text-align', 'left');
  button_div.appendChild(sub5_button);
  button_div.appendChild(sub2_button);
  distrust_button_node.appendChild(button_div);

  sub5.appendChild(first_node);
  sub5.appendChild(middle_node);
  sub5.appendChild(last_node);
  sub5.appendChild(distrust_button_node);

  //blank row
  var spacer = document.createElement('tr');
  spacer.className = "spacer";
  spacer.id = "spacer-row" + num;

  var table = document.getElementById("auth_table");
  table.appendChild(parent);
  table.appendChild(sub1);
  table.appendChild(sub2);
  table.appendChild(sub4);
  table.appendChild(sub3);
  table.appendChild(sub5);
  table.appendChild(spacer);

  // clicking function of clicking on cert group title row.
  parent.onclick = function(){
    $(this).toggleClass('parentClosed');
    $(this).toggleClass('parentOpen');
    $(this).siblings('.child-' + this.id).toggle('fast');
    if($(this).siblings('.child-' + this.id).is(':visible')){
      parent.scrollIntoView({behavior:"smooth"});
    }
  };
});

/*
 * handles clicking the distrust button
 */
function distrust(num) {
  self.port.emit("distrustAuth", num);
  $(".child-row"+num).addClass('distrustedRow');
  $("#row"+num).addClass('distrustedRow');
  $("#distrust-"+num).attr('onclick', '').unbind().click(function() { entrust(num); });
  $("#distrust-"+num).text("Trust");
  $("#distrust-"+num).title = "Trust the expanded authority";
  $("#distrust-"+num).toggleClass("red");
  $("#distrust-"+num).toggleClass('green');
  $("#distrust-"+num).attr('id', 'entrust-'+num);
  $("#row"+num + " img, #row" + num + " meter").addClass('distrustedImage');
}

/*
 * handles clicking the trust button
 */
function entrust(num) {
  self.port.emit("entrustAuth", num);
  $(".child-row"+num).removeClass('distrustedRow');
  $("#row"+num).removeClass('distrustedRow');
  $("#entrust-"+num).attr('onclick', '').unbind().click(function() { distrust(num); });
  $("#entrust-"+num).text("Distrust");
  $("#entrust-"+num).title = "Trust the expanded authority";
  $("#entrust-"+num).toggleClass("red");
  $("#entrust-"+num).toggleClass('green');
  $("#entrust-"+num).attr('id', 'distrust-'+num);
  $("#row"+num + " img, #row" + num + " meter").removeClass('distrustedImage');
}

/*
 * handles clicking the show details button
 */
function showDetails(num) {
  var table = document.getElementById("cert_table");
  while (table.hasChildNodes()) {
    table.removeChild(table.firstChild);
  }
  window.listCerts(num);
  $("#authTitle").text("CERTIFICATES");
  $("#infoText").text("The search bar filters items by certificate names");
  $("#main_table").toggle();
  $("#detail_table").toggle();
  $("#certsSearch").toggle();
  $("#authsSearch").toggle();
  $("#authName").text($("#name" + num).text());
  var image = document.createElement('i');
  image.setAttribute("class", "fa fa-chevron-left fa-2x");
  image.title = "Go back to Authority list";
  $("#back_button").empty();
  document.getElementById("back_button").appendChild(image);
  $("#viewButton").show();
  $("#exportButton").show();
  $("#authName").show();
  $("#back_button").show();
  $("#delete").show();
  $("#footer_plain").attr("id", "footer");
  $("#viewButton").addClass("disabled");
  $("#delete").addClass("disabled");
}

/*
 * handles clicking the trust or distrust button when viewing the certificates in cert group
 *
 * this button unchecks all the boxes for the specific certificate selected
 */
function updateCertTrust(classId) {
  var allChecks = $("."+classId);
  var num = classId.split('-')[0];
  editCertTrust(num, classId.split('-')[1], allChecks[0].checked, allChecks[1].checked, allChecks[2].checked);

  var allChecked = $('#detail_table input[type=checkbox]:checked');
  if (allChecked.length === 0) {
    $(".child-row"+num).addClass('distrustedRow');
    $("#row"+num).addClass('distrustedRow');
    $("#distrust-"+num).attr('onclick', '').unbind().click(function() { entrust(num); });
    $("#distrust-"+num).text("Trust");
    $("#distrust-"+num).title = "Trust the expanded authority";
    $("#distrust-"+num).toggleClass("red");
    $("#distrust-"+num).toggleClass('green');
    $("#distrust-"+num).attr('id', 'entrust-'+num);
    $("#row"+num + " img, #row" + num + " meter").addClass('distrustedImage');
  } else if (allChecked.length >= 1) {
    if($("#entrust-"+num).length) {
      $(".child-row"+num).removeClass('distrustedRow');
      $("#row"+num).removeClass('distrustedRow');
      $("#entrust-"+num).attr('onclick', '').unbind().click(function() { distrust(num); });
      $("#entrust-"+num).text("Distrust");
      $("#entrust-"+num).title = "Trust the expanded authority";
      $("#entrust-"+num).addClass("red");
      $("#entrust-"+num).removeClass('green');
      $("#entrust-"+num).attr('id', 'distrust-'+num);
      $("#row"+num + " img, #row" + num + " meter").removeClass('distrustedImage');
    }
  }
}

// web, email, and software should be either "" or "checked"
self.port.on("insert_cert", function insert_cert(id, num, name, builtin, web, email, software) {
  var parent = document.createElement('tr');
  parent.className = 'parent';
  parent.id = id + '-' + num;

  var name_node = document.createElement('td');
  var text = document.createTextNode(name);
  name_node.appendChild(text);

  var builtin_node = document.createElement('td');
  text = document.createTextNode(builtin);
  builtin_node.appendChild(text);

  var web_node = document.createElement('td');
  input = document.createElement('input');
  input.className = id + '-' + num;
  input.type = 'checkbox';
  input.checked = false;
  if(web=='checked'){
    input.checked = true;
  }
  web_node.onclick = function(){
    updateCertTrust(id + '-' + num);
  };
  web_node.checked = web_node;
  web_node.appendChild(input);

  var email_node = document.createElement('td');
  input = document.createElement('input');
  input.className = id + '-' + num;
  input.type = 'checkbox';
  input.checked = false;
  if(email=='checked'){
    input.checked = true;
  }
  email_node.onclick = function(){
    updateCertTrust(id + '-' + num);
  };
  email_node.checked = email_node;
  email_node.appendChild(input);

  var software_node = document.createElement('td');
  input = document.createElement('input');
  input.className = id + '-' + num;
  input.type = 'checkbox';
  input.checked = false;
  if(software=='checked'){
    input.checked = true;
  }
  software_node.onclick = function(){
    updateCertTrust(id + '-' + num);
  };
  software_node.checked = software_node;
  software_node.appendChild(input);

  parent.appendChild(name_node);
  parent.appendChild(builtin_node);
  parent.appendChild(web_node);
  parent.appendChild(email_node);
  parent.appendChild(software_node);

  var table = document.getElementById("cert_table");
  table.appendChild(parent);

  document.getElementById('viewButton').onclick = function() {
    self.port.emit("viewCert", id,$("#cert_table tr.selected").index());
  };

  document.getElementById('delete').onclick = function() {
    self.port.emit("deleteCert", id,$("#cert_table tr.selected").index());
    $('#cert_table tr.selected').find('input[type=checkbox]:checked').removeAttr('checked');

    var allChecked = $('#detail_table input[type=checkbox]:checked');
    if (allChecked.length === 0) {
      $(".child-row"+id).addClass('distrustedRow');
      $("#row"+id).addClass('distrustedRow');
      $("#distrust-"+id).attr('onclick', '').unbind().click(function() { entrust(id); });
      $("#distrust-"+id).text("Trust");
      $("#distrust-"+id).title = "Trust the expanded authority";
      $("#distrust-"+id).toggleClass("red");
      $("#distrust-"+id).toggleClass('green');
      $("#distrust-"+id).attr('id', 'entrust-'+id);
      $("#row"+id + " img, #row" + id + " meter").addClass('distrustedImage');
    } else if (allChecked.length >= 1) {
      if($("#entrust-"+id).length) {
        $(".child-row"+id).removeClass('distrustedRow');
        $("#row"+id).removeClass('distrustedRow');
        $("#entrust-"+id).attr('onclick', '').unbind().click(function() { distrust(id); });
        $("#entrust-"+id).text("Distrust");
        $("#entrust-"+id).title = "Trust the expanded authority";
        $("#entrust-"+id).addClass("red");
        $("#entrust-"+id).removeClass('green');
        $("#entrust-"+id).attr('id', 'distrust-'+id);
        $("#row"+id + " img, #row" + id + " meter").removeClass('distrustedImage');
      }
    }
  };

  document.getElementById('exportButton').onclick = function() {
    self.port.emit("exportCert", id,$("#cert_table tr.selected").index());
  };

  var rowOnClick = function(){
    $(this).addClass("selected").siblings().removeClass("selected");
    $("#delete").removeClass("disabled");
    $("#viewButton").removeClass("disabled");
  };
  var rowOnDblClick = function(){
    self.port.emit("viewCert", id,$(this).index());
  };
  var rows = table.rows;
  for(var r = 0 ; r < rows.length ; r++){
    rows[r].onclick = rowOnClick;
    rows[r].ondblclick = rowOnDblClick;
  }
});

self.port.on("select_auth", function select_auth(num){
  var x = "#row"+num;
  $(x).click();
});
