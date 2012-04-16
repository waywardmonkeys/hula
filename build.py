import fnmatch
import os
import shutil
import httplib
import sys
import subprocess

src = 'src'
dest = 'build'

prefix = len(src)

conn = httplib.HTTPConnection(sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1:5000")

for srcroot, dirnames, filenames in os.walk(src, followlinks=True):
    for i, directory in enumerate(dirnames):
        if directory[0] == '.':
            del dirnames[i]
    destroot = dest + srcroot[prefix:]
    if not os.path.exists(destroot):
        os.mkdir(destroot)
    for filename in filenames:
        if filename[0] == '.':
            continue
        srcpath = os.path.join(srcroot, filename)
        if fnmatch.fnmatch(filename, '*.ralph'):
            destfilename = os.path.splitext(filename)[0] + '.js'
            destpath = os.path.join(destroot, destfilename)
            if (not os.path.exists(destpath) or
                os.path.getmtime(srcpath) > os.path.getmtime(destpath)):
                print '*', srcpath
                input = open(srcpath, 'r')
                code = input.read()
                input.close()
                conn.request("POST", "/?asynchronous=true", code)
                response = conn.getresponse()
                body = response.read()
                if response.status == 200:
                    output = open(destpath, 'w')
                    output.write(body)
                    output.close()
                else:
                    sys.stderr.write(body + '\n')
                    sys.exit(1)
        elif fnmatch.fnmatch(filename, '*.less'):
            destfilename = os.path.splitext(filename)[0] + '.css'
            destpath = os.path.join(destroot, destfilename)
            if (not os.path.exists(destpath) or
                os.path.getmtime(srcpath) > os.path.getmtime(destpath)):
                print '~', srcpath
                output = open(destpath, 'w')
                process = subprocess.Popen(['lessc', srcpath], shell=False, stdout=output)
                output.close()
        else:
            destpath = os.path.join(destroot, filename)
            if (not os.path.exists(destpath) or
                os.path.getmtime(srcpath) > os.path.getmtime(destpath)):
                print '-', srcpath
                shutil.copy(srcpath, destpath)
