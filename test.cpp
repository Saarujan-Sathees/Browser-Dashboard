// g++ test.cpp -lwsock32 -std=c++17 -o dashboard-server.exe -mwindows
#include <fstream>
#include <iostream>
#include <WinSock2.h>
#include <string>
#include <filesystem>
#include <thread>

namespace fs = std::filesystem;

HANDLE console = GetStdHandle(STD_OUTPUT_HANDLE);
#define SUCCESS 0
#define FAILURE 2
#define LOGGING_ENABLED true 

void log(int type, std::string name, int lineNum, int reason = WSAGetLastError()) {
    if (LOGGING_ENABLED) {
        SetConsoleTextAttribute(console, 10 + type);
        if (type == FAILURE) 
            std::cout << __FILE__ << ":" << lineNum << "\t# " << name << " Error: " << reason << "\n";
        else
            std::cout << __FILE__ << ":" << lineNum << "\t# " << name << " Succesful\n";

        SetConsoleTextAttribute(console, 7);
    }
}

WSADATA startWSA() {
    WSADATA w;
    int startupResult = WSAStartup(MAKEWORD(2, 2), &w);
    if (startupResult != 0) {
        log(FAILURE, "startWSA()", __LINE__, startupResult);
        return startWSA();
    }
    
    log(SUCCESS, "startWSA()", __LINE__);
    return w;
}

void bindSock(SOCKET &sock, sockaddr_in &server) {
    int res = bind(sock, (struct sockaddr *) &server, sizeof(server));
    if (res == SOCKET_ERROR) {
        log(FAILURE, "bindSock()", __LINE__);
        bindSock(sock, server);
    } else {
        log(SUCCESS, "bindSock()", __LINE__);
    }
}

SOCKET createSock(int type) {
    SOCKET sock = socket(type, SOCK_STREAM, IPPROTO_TCP);
    if (sock == INVALID_SOCKET) {
        log(FAILURE, "createSock()", __LINE__);
        return createSock(type);
    } 
    log(SUCCESS, "createSock()", __LINE__);
    return sock;
}

void readCommand(std::string fileRedirect, std::string &result, std::string start = "", std::string end = "") {
    std::ifstream input(fileRedirect);
    result = "";
    
    if (start == "" && end == "") {
        while (input.good()) {
            int curr = input.get();
            if (curr >= 32 && curr <= 126) 
                result += (char) curr;
        }
    } else {
        int index = 0, curr;
        result = "";

        while (input.good() && index < start.size()) { //First loop removes all the unnecessary characters
            curr = input.get();
            if (curr >= 32 && curr <= 126) {
                if (start[index] == (char) curr) {
                    result += (char) curr;
                    ++index;
                } else if (index > 0) {
                    result = "";
                    index = 0;
                }
            }
        }

        index = 0;
        while (input.good() && index < end.size()) { //First loop removes all the unnecessary characters
            curr = input.get();
            if (curr >= 32 && curr <= 126) {
                result += (char) curr;
                if (end[index] == (char) curr)
                    ++index;
                else if (index > 0) 
                    index = 0;
            }
        }
    }

    input.close();
}

void shellCommand(std::string cmd, std::string redirect, std::string start = "", std::string end = "") {
    STARTUPINFOA si = {0};
    PROCESS_INFORMATION pi = {0};
    char* fullCommand = ("powershell " + cmd + " > " + redirect).data();
    
    if (CreateProcessA(NULL, fullCommand, NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, NULL, &si, &pi)) {
        WaitForSingleObject(pi.hProcess, INFINITE);
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
        
        if (start != "" && end != "") {
            std::string result;
            readCommand(redirect, result, start, end);
            std::ofstream output(redirect);
            output << result.c_str();
            output.close();
        }
    } else {
        std::cout << GetLastError() << " Shell Command\n";
    }
}

class Server {
    protected:
    WSADATA wsa;
    SOCKET main, connection;
    struct sockaddr_in info, address;

    static std::string getIPv4() {
        std::string file;
        shellCommand("ipconfig", "ipaddr.txt");
        readCommand("ipaddr.txt", file);
        std::remove("ipaddr.txt");

        int start = file.find("IPv4");
        while (start < file.size() && file[start - 2] != ':') {
            ++start;
        }

        std::string ip = "";
        do {
            ip += file[start++];
        } while (file[start] == '.' || (file[start] >= '0' && file[start] <= '9'));
        
        return ip;
    }

    static void fetchInfoLoop() {
        while (1) {
            shellCommand("(wget https://einthusan.tv/movie/browse/?lang=tamil).Content", 
                         "einthusan.txt", "UIFeaturedFilms", "dot-nav");
            shellCommand("(wget https://www.google.com/search?q=weather\\\"&\\\"rlz=1C1CHBD_enCA724CA727\\\"&\\\"ie=UTF-8).ParsedHtml.body.innerHTML", 
                         "weather.txt", "BNeawe iBp4i AP7Wnd", "<H3 class=\"zBAuLc l97dzf\">");
            std::this_thread::sleep_for(std::chrono::seconds(3600));
        }
    }

    std::string fetch(std::string fileName) {
        std::string body;
        readCommand(fileName, body);
        log(SUCCESS, fileName + " Fetch", __LINE__);
        return body;
    }

    public:
    Server(const short &port) {
        wsa = startWSA();
        info.sin_family = AF_INET;
        info.sin_addr.S_un.S_addr = INADDR_ANY;
        info.sin_port = htons(port);

        main = createSock(info.sin_family);
        bindSock(main, info);
    }

    void start() {
        listen(main, 1);
        std::thread fetchThread(fetchInfoLoop);
        while (1) {
            connection = accept(main, NULL, NULL);
            getpeername(connection, (struct sockaddr*) &address, (int*) (sizeof(address)));
            char buffer[1024];
            int result = recv(connection, buffer, sizeof(buffer), 0);
            std::string request = buffer;
            if (std::string(inet_ntoa(address.sin_addr)).find("0.0.0.0") != -1) {
                request = request.substr(request.find("/") + 1, request.find(" HTTP") - 5);
                std::string response = "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: text/html\r\nConnection: Closed\r\n\r\n";
                if (request == "movie-fetch")
                    response += fetch("einthusan.txt");
                else if (request == "profile-information")
                    response += "";
                else if (request == "weather-fetch")
                    response += fetch("weather.txt");
                    
                send(connection, response.c_str(), response.length(), 0);
            } else {
                std::cout << request << "\n";
            }

            closesocket(connection);
        }

        fetchThread.join();
    }
};

int main() { //WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nShowCmd) {
    Server main(2020);
    main.start();
}
