import requests

# Data extracted from your screenshots
endpoints = {
    "Compilers": {
        "url": "https://8636f249.compilers.sphere-engine.com/api/v4/test",
        "token": "2f85dd96e07a3d97ea0791b5b79652cc"
    },
    "Problems": {
        "url": "https://8636f249.problems.sphere-engine.com/api/v4/test",
        "token": "d2c6b9176f0788b4a6e0ac6b925d2af5"
    },
    "Containers": {
        "url": "https://8636f249.containers.sphere-engine.com/api/v1/test",
        "token": "2f85dd96e07a3d97ea0791b5b79652cc" # Using compiler token as placeholder
    }
}

def check_tokens():
    for name, data in endpoints.items():
        try:
            params = {'access_token': data['token']}
            response = requests.get(data['url'], params=params)
            status = "VALID" if response.status_code == 200 else f"FAILED ({response.status_code})"
            print(f"{name:10} | Status: {status} | Response: {response.text}")
        except Exception as e:
            print(f"{name:10} | Connection Error: {e}")

if __name__ == "__main__":
    check_tokens()