// Java 示例
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.jpa.repository.JpaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.reactivex.Observable;
import reactor.core.publisher.Mono;

// 测试选中这些标识符来检测库
@SpringBootApplication
@RestController
public class ExampleApplication {
    public static void main(String[] args) {
        SpringApplication.run(ExampleApplication.class, args);
    }
    
    @GetMapping("/hello")
    public Mono<String> hello() {
        return Mono.just("Hello, World!");
    }
}

// Jackson 使用
ObjectMapper mapper = new ObjectMapper();

// RxJava 使用
Observable.just("a", "b", "c")
    .subscribe(System.out::println);