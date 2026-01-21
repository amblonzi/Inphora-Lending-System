import os
import sys

def application(environ, start_response):
    """
    WSGI App to read and display stderr.log
    """
    status = '200 OK'
    response_headers = [('Content-type', 'text/plain; charset=utf-8')]
    start_response(status, response_headers)
    
    output = ["--- SERVER ERROR LOG (stderr.log) ---", ""]
    
    log_file = os.path.join(os.path.dirname(__file__), 'stderr.log')
    
    if os.path.exists(log_file):
        try:
            with open(log_file, 'r') as f:
                # Read last 100 lines
                lines = f.readlines()
                output.extend(lines[-100:])
        except Exception as e:
            output.append(f"Error reading log file: {e}")
    else:
        output.append("stderr.log not found.")
        
    return ["\n".join(output).encode('utf-8')]
