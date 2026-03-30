@echo off
REM HTTP Proxy Catcher - Test Example Script (Windows)
REM This script demonstrates how to use the HTTP proxy

echo ================================
echo HTTP Proxy Catcher - Test Example
echo ================================
echo.

REM Configuration
set NAMESPACE=test-api
set BASE_URL=http://localhost:5173
set TARGET_HOST=https://jsonplaceholder.typicode.com

echo Step 1: Configure the namespace
echo Setting target host to: %TARGET_HOST%
curl -X POST "%BASE_URL%/api/%NAMESPACE%" -H "Content-Type: application/json" -d "{\"targetHost\":\"%TARGET_HOST%\"}"
echo.
echo.
echo Configuration saved!
echo.
echo Open the panel to watch requests in real-time:
echo    %BASE_URL%/panel/%NAMESPACE%
echo.
pause

echo.
echo Step 2: Send test requests through the proxy
echo.

echo Test 1: GET request - Fetch a user
echo -----------------------------------
curl "%BASE_URL%/%NAMESPACE%/users/1"
echo.
timeout /t 2 >nul

echo.
echo Test 2: GET request - Fetch posts
echo ----------------------------------
curl "%BASE_URL%/%NAMESPACE%/posts?userId=1"
echo.
timeout /t 2 >nul

echo.
echo Test 3: POST request - Create a new post
echo -----------------------------------------
curl -X POST "%BASE_URL%/%NAMESPACE%/posts" -H "Content-Type: application/json" -d "{\"title\":\"Test Post\",\"body\":\"This is a test post from the HTTP Proxy Catcher\",\"userId\":1}"
echo.
timeout /t 2 >nul

echo.
echo Test 4: PUT request - Update a post
echo ------------------------------------
curl -X PUT "%BASE_URL%/%NAMESPACE%/posts/1" -H "Content-Type: application/json" -d "{\"id\":1,\"title\":\"Updated Title\",\"body\":\"Updated body content\",\"userId\":1}"
echo.
timeout /t 2 >nul

echo.
echo Test 5: DELETE request - Delete a post
echo ---------------------------------------
curl -X DELETE "%BASE_URL%/%NAMESPACE%/posts/1"
echo.

echo.
echo Done! Check the panel to see all requests:
echo    %BASE_URL%/panel/%NAMESPACE%
echo.
echo You should see 5 requests with full details:
echo    - Request/response headers
echo    - Request/response bodies
echo    - Status codes and timing
echo.
pause
