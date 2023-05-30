// Include -lwsock32 when compiling with G++
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

void shellCommand(std::string cmd, std::string redirect) {
    STARTUPINFOA si = {0};
    PROCESS_INFORMATION pi = {0};

    if (CreateProcessA(NULL, ("powershell " + cmd + " > " + redirect).data(), NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, NULL, &si, &pi)) {
        WaitForSingleObject(pi.hProcess, INFINITE);
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
    } else {
        std::cout << GetLastError() << " Shell Command\n";
    }
}

void readCommand(std::string fileRedirect, std::string &result) {
    std::ifstream input(fileRedirect);
    result = "";
    
    while (input.good()) {
        int curr = input.get();
        if (curr >= 32 && curr <= 126) 
            result += (char) curr;
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

    static void fetchEinthusan() {
        while (1) {
            shellCommand("(wget https://einthusan.tv/movie/browse/?lang=tamil).Content", "output.txt");
            std::this_thread::sleep_for(std::chrono::seconds(3600));
        }
    }

    std::string movieFetch() {
        std::string body;
        readCommand("output.txt", body);

        log(SUCCESS, "Einthusan Fetch", __LINE__);
        return body.substr(body.find("UIFeaturedFilms"), body.find("dot-nav"));
    }

    public:
    Server(const short &port) {
        wsa = startWSA();
        info.sin_family = AF_INET;
        info.sin_addr.S_un.S_addr = inet_addr(getIPv4().c_str());
        info.sin_port = htons(port);

        main = createSock(info.sin_family);
        bindSock(main, info);
    }

    void start() {
        listen(main, 1);
        std::thread fetch(fetchEinthusan);
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
                    response += movieFetch();
                else if (request == "profile-information")
                    response += "";
                    
                send(connection, response.c_str(), response.length(), 0);
            } else {
                std::cout << request << "\n";
            }

            closesocket(connection);
        }

        fetch.join();
    }
};

int main() { //WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nShowCmd) {
    Server main(2020);
    main.start();
}