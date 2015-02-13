var helpers = (function(){
	function throttle(callback, time){
    var wait = false;
	  return function(){      
      if (!wait){
  	    wait = true;
        callback.call();
  	    setTimeout(function(){
  	      wait = false
  	    }, time)
      }
	  }
	}
  function rootMeanSquare(dataArray){
    var sum = 0;
    for(var i = 0; i < dataArray.length; i++)
    {
      sum += dataArray[i] * dataArray[i]
    }
    return Math.sqrt(sum/dataArray.length)
  }

	return{
		throttle: throttle,
    rootMeanSquare: rootMeanSquare
	}
})();