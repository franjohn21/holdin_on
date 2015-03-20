var visualizer = (function(){
  var cube, current_base, renderer, scene, camera, dataArray, analyzer, rms, randomColors, prevScale, scale, currTrackId, client_id, lastTime, stats, bars, controls; 
  function init(){
    bindEvents();
    setupStats();
    setupAudio();
    setupObjects();
    setupCamera();
    render();
  }

  function render(time) {
    stats.begin();
    animate( time);
    renderer.render( scene, camera );
    stats.end();
    requestAnimationFrame( render );
  }

  function bindEvents(){    
    $("#searchContainer").submit(function(evt){
        evt.preventDefault();
        console.log($("#searchList li").first().attr("id"))
       if($("#searchList li").length > 0)
       {
        currTrackId = $("#searchList li").first().attr("id");
        loadSong();
       }
       else
        newSearch();
    })
    $("#searchList").on("mousedown", "li", function(evt){
      currTrackId = $(this).attr("id");
      loadSong();
      $("#searchList").slideUp();
      $("#searchList li").remove();
    });
    $("#search").blur(function(){
      $("#search").val("")
      $("#searchList").slideUp();
      $("#searchList li").remove();
    });

    $("#search").on("keyup", function(){
      if($(this).val().length > 5){
        newSearch();
      }
    });
  }

  function setupStats(){
    stats = new Stats();
    stats.setMode(1); // 0: fps, 1: ms

    // align top-left
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.bottom = '0px';
    document.body.appendChild( stats.domElement );
  }
  function newSearch(){
    var count = 0;
    $.get('https://api.soundcloud.com/tracks/?client_id=' + client_id, {q: $("#search").val()})
     .done(function(response){
      console.log(response)
      $("#searchList li").remove();
      console.log(response)
      for(var i = 0; i < response.length; i++)
      {
        if(response[i].streamable === true)
        {
          $("#searchList").append("<li id=" + response[i].id + ">" + response[i].title + "</li>")
          count += 1;
        }
        if(count > 10)
          break;
      }
      $("#searchList").slideDown();
    }).fail(function(response, what){
      console.log(response)
      console.log(what)
    })
  }

  function randomizeColors(){
    if (current_base.getHex().toString(16) === "ffffff" || current_base.getHex().toString(16) === "000000")
      current_base.setHex(Math.random()*0xFFFFFF);
    else
    {
      current_base.set('#' + (current_base.getHex() + 100101).toString(16));
    }
    for(var i = 0; i < dataArray.length; i++){ 
      bars[i].material.specular.set('#' + (bars[i].material.specular.getHex() + 1000).toString(16));
    }
  } 

  function volScale(val, poss){
    return ((rms - 120)/ 50)*(val / poss)
  }
  function animate(time){
    // TweenMax.to(camera.position, 0.5, {x: (mouse.x*200 - camera.position.x), y: (mouse.y*200 - camera.position.y)})
    // camera.lookAt(scene.position)
    analyzer.getByteTimeDomainData(dataArray);
    rms = helpers.rootMeanSquare(dataArray);
    controls.update();

    prevScale = scale; 
    scale = volScale(1, 1);
    // if(Math.abs(prevScale - scale) > 0.05)
      // TweenMax.to(cube.scale, 0.3, {x: scale*5, y: scale*5, z: scale*5});
    if (rms > 150)
      randomColors();
    // TweenMax.to(cube.material.color, 0.5, {r: volScale(current_base.r, 0.8), g: (volScale(current_base.g, 0.8)), b: (volScale(current_base.b, 0.8))});
    // cube.rotation.y += 0.001;
    // cube.rotation.x += 0.001;
    for(var i = 0; i < dataArray.length; i++){
      TweenMax.to(bars[i].material.color, 0.32, {r: volScale(current_base.r, 0.8), g: (volScale(current_base.g, 0.8)), b: (volScale(current_base.b, 0.8))});
      if(Math.abs(bars[i].scale.y - (dataArray[i]/128.0)*50) > 0.001){
        TweenMax.to(bars[i].scale, 0.3, {y: (dataArray[i]/128.0)*10, z: volScale(3, 1)})
      }
      else
        TweenMax.to(bars[i].scale, 0.3, {z: volScale(10, 1)})
    }
  }


  function setupObjects(){
    renderer = new THREE.WebGLRenderer();
    $("body").height(window.innerHeight);
    $("body").width(window.innerWidth);
    renderer.setSize( window.innerWidth, window.innerHeight );
    $("#canvas").append( $(renderer.domElement) );
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.x = 0;
    camera.position.y = 50;
    camera.position.z = 50;
    controls = new THREE.TrackballControls( camera );
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    controls.noZoom = false;
    controls.noPan = false;

    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    current_base = new THREE.Color(0xffffff)
    randomColors = helpers.throttle(randomizeColors, 1000)
    scene = new THREE.Scene();

    bars = [];
    for(var i = 0; i < dataArray.length; i++)
    {
      var geometry = new THREE.BoxGeometry( .1, .5, 1);
      var material = new THREE.MeshPhongMaterial( { color: current_base, specular: 0x808080, shininess: 3} );
      bars[i] = new THREE.Mesh( geometry, material );
      bars[i].position.set((i-dataArray.length/2)/10.0, 0, 0);
      scene.add(bars[i]);

    }


    // var geometry = new THREE.BoxGeometry( 1, 1, 1);
    // var material = new THREE.MeshPhongMaterial( { color: current_base, specular: 0x808080, shininess: 3} );
    // cube = new THREE.Mesh( geometry, material );
    var directionalLight = new THREE.DirectionalLight(0xF0F0F0);
    directionalLight.position.set(1, 1, 1).normalize();
    var ambientLight = new THREE.AmbientLight(0x888888);
    var stars = new THREE.Mesh(
      new THREE.SphereGeometry(64, 100, 100), 
      new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture('images/galaxy_starfield.png'), 
        side: THREE.BackSide
      })
    );
    scene.add(directionalLight);
    scene.add(ambientLight);
    scene.add(stars);
  }

  function setupAudio(){
    currTrackId = '114238860';
    client_id = '74b881a5de59c54912d700542b60b955'
    var context = new AudioContext();
    analyzer = context.createAnalyser();
    var song = $("#song")[0];
    loadSong();
    var source = context.createMediaElementSource(song);
    dataArray = new Uint8Array(analyzer.frequencyBinCount)
    source.connect(context.destination)
    source.connect(analyzer);
    analyzer.getByteTimeDomainData(dataArray);
  }
  function loadSong(){
    addLoadingScreen();
    $.get('https://api.soundcloud.com/tracks/' + currTrackId + '.json?client_id=' + client_id, function(songData){
      $("#songArtwork").attr("src",songData.artwork_url)
      $("#currSong").text(songData.title)
      $("#currSong").attr("href", songData.permalink_url)
      removeLoadingScreen();
      song.src = 'https://api.soundcloud.com/tracks/' + currTrackId + '/stream?client_id=' + client_id;
      song.play();
      var min = parseInt(songData.duration / 60000);
      var sec = parseInt((songData.duration / 1000) % 60);
      sec = sec < 10 ? '0' + sec : sec;
      $("#duration").text(min + ":" + sec)
    })
  }
  var mouse = {x : 0, y : 0};
  function setupCamera(){   
    $("canvas").on('mousemove', function(event){
      mouse.x = (event.clientX / window.innerWidth) - 0.5;
      mouse.y = (event.clientY / window.innerHeight) - 0.5;
    })
  }
  function addLoadingScreen(){
    $("#canvas").addClass("blur");
    $("#loadingAnimation").show();
  }
  function removeLoadingScreen(){
    $("#loadingAnimation").hide();
    $("#canvas").removeClass("blur");
  }

  return {
    init: init 
  }
})();

$(function(){
  visualizer.init();
})
