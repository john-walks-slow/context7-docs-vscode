// Swift 示例
import Foundation
import SwiftUI
import Alamofire
import Kingfisher
import Lottie
import SnapKit

// 测试选中这些标识符来检测库
struct ContentView: View {
    var body: some View {
        VStack {
            Text("Hello, World!")
                .padding()
            
            KFImage(URL(string: "https://example.com/image.jpg"))
                .resizable()
                .frame(width: 100, height: 100)
        }
    }
}

// Alamofire
AF.request("https://api.example.com").response { response in
    debugPrint(response)
}

// SnapKit
view.snp.makeConstraints { make in
    make.center.equalToSuperview()
}

// Lottie
let animationView = AnimationView(name: "loading")
animationView.play()