var visualizer = (function(){
  var cube, current_base, renderer, scene, camera, dataArray, analyzer, rms, randomColors, prevScale, scale; 

  function init(){
    setupObjects();
    setupAudio();
    setupCamera();
    render();
  }

  function render() {
    requestAnimationFrame( render );
    animate();
    renderer.render( scene, camera );
  }

  function randomizeColors(){
    console.log('wtf')
    if (current_base.getHex().toString(16) === "ffffff" || current_base.getHex().toString(16) === "000000")
      current_base.setHex(Math.random()*0xFFFFFF);
    else
    {
      current_base.set('#' + (current_base.getHex() + 100101).toString(16));
    }
      cube.material.specular.set('#' + (cube.material.specular.getHex() + 1000).toString(16));
    console.log(current_base)

  } 

  function volScale(val, poss){
    return ((rms - 120)/ 50)*(val / poss)
  }
  function animate(){
    analyzer.getByteTimeDomainData(dataArray);
    rms = helpers.rootMeanSquare(dataArray);
    console.log(rms)
    prevScale = scale; 
    scale = volScale(1, 1);
    if(Math.abs(prevScale - scale) > 0.03)
      TweenMax.to(cube.scale, 0.5, {x: scale*5, y: scale*5, z: scale*5});
    if (rms > 150)
      randomColors();
    TweenMax.to(cube.material.color, 0.5, {r: volScale(current_base.r, 0.8), g: (volScale(current_base.g, 0.8)), b: (volScale(current_base.b, 0.8))});
    cube.rotation.y += 0.001;
    cube.rotation.x += 0.001;
  }


  function setupObjects(){
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    $("#canvas").append( $(renderer.domElement) );
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
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
    var context = new AudioContext();
    analyzer = context.createAnalyser();
    var song = $("#song")[0]
    var source = context.createMediaElementSource(song);
    dataArray = new Uint8Array(analyzer.frequencyBinCount)
    source.connect(context.destination)
    source.connect(analyzer);
    analyzer.getByteTimeDomainData(dataArray);
    song.play();
  }

  function setupCamera(){   
    var mouse = {x : 0, y : 0};
    $("canvas").on('mousedown', function(event){
      var xVal = event.clientX > window.innerWidth/2 ? 0.5 : -0.5
      var yVal = event.clientY > window.innerHeight/2 ? 0.5 : -0.5

      TweenMax.to(camera.position, 0.1, {x: camera.position.x + xVal , y: camera.position.y + yVal})
      camera.lookAt( scene.position )
    })
  }
  return {
    init: init 
  }
})();

$(function(){
  visualizer.init();
})
