var visualizer = (function(){
  var cube, current_base, renderer, scene, camera, dataArray, analyzer, rms, randomColors, prevScale, scale, currTrackId, client_id, lastTime, stats; 
  function init(){
    addLoadingScreen();
    bindEvents();
    setupStats();
    setupObjects();
    setupAudio();
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
      console.log('hitting keypress?')
      if($(this).val().length > 5){
        console.log('researching?')
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
      cube.material.specular.set('#' + (cube.material.specular.getHex() + 1000).toString(16));
  } 

  function volScale(val, poss){
    return ((rms - 120)/ 50)*(val / poss)
  }
  function animate(time){
    TweenMax.to(camera.position, 0.5, {x: (mouse.x*50 - camera.position.x), y: (mouse.y*50 - camera.position.y)})
    camera.lookAt( scene.position );
    console.log();
    analyzer.getByteTimeDomainData(dataArray);
    rms = helpers.rootMeanSquare(dataArray);
    prevScale = scale; 
    scale = volScale(1, 1);
    if(Math.abs(prevScale - scale) > 0.05)
      TweenMax.to(cube.scale, 0.3, {x: scale*5, y: scale*5, z: scale*5});
    if (rms > 150)
      randomColors();
    TweenMax.to(cube.material.color, 0.5, {r: volScale(current_base.r, 0.8), g: (volScale(current_base.g, 0.8)), b: (volScale(current_base.b, 0.8))});
    cube.rotation.y += 0.001;
    cube.rotation.x += 0.001;
  }


  function setupObjects(){
    renderer = new THREE.WebGLRenderer();
    $("body").height(window.innerHeight);
    $("body").width(window.innerWidth);
    renderer.setSize( window.innerWidth, window.innerHeight );
    $("#canvas").append( $(renderer.domElement) );
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 5;
    current_base = new THREE.Color(0xffffff)
    randomColors = helpers.throttle(randomizeColors, 1000)
    var geometry = new THREE.BoxGeometry( 1, 1, 1);
    var material = new THREE.MeshPhongMaterial( { color: current_base, specular: 0x808080, shininess: 3} );
    cube = new THREE.Mesh( geometry, material );
    cube.rotation.y += 0.5;
    cube.rotation.x += 0.5;
    var directionalLight = new THREE.DirectionalLight(0xF0F0F0);
    directionalLight.position.set(1, 1, 1).normalize();
    var ambientLight = new THREE.AmbientLight(0x888888);
    var stars = new THREE.Mesh(
      new THREE.SphereGeometry(64, 32, 32), 
      new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture('images/galaxy_starfield.png'), 
        side: THREE.BackSide
      })
    );
    scene = new THREE.Scene();
    scene.add(cube);
    scene.add(directionalLight);
    scene.add(ambientLight);
    scene.add(stars);
  }

  function setupAudio(){
    currTrackId = '63121479';
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
    song.play();
  }
  function loadSong(){
    addLoadingScreen();
    song.src = 'https://api.soundcloud.com/tracks/' + currTrackId + '/stream?client_id=' + client_id;
    $.get('https://api.soundcloud.com/tracks/' + currTrackId + '.json?client_id=' + client_id, function(songData){
      $("#songArtwork").attr("src",songData.artwork_url)
      $("#currSong").text(songData.title)
      $("#currSong").attr("href", songData.permalink_url)
      removeLoadingScreen();
      song.play();
      var min = parseInt(songData.duration / 60000);
      var sec = parseInt((songData.duration / 1000) % 60);
      sec = sec < 10 ? '0' + sec : sec;
      console.log(song.curr)
      console.log(min)
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
