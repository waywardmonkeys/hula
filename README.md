# Hula

Dylan IDE written in Ralph.

## Requirements

 * [Ralph](http://github.com/turbolent/ralph)
 * [toolbox](http://github.com/turbolent/toolbox)

## Build

* `cd src`
* `ln -s ../../toolbox .`
* `ln -s ../../ralph/src/ralph .`
* `cd ..`
* Make sure the compiler service is running
* `python build.py`
* `nginx -p . -c nginx.conf`
*  Open http://localhost:8000/
