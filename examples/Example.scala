// Scala 示例
import akka.actor.ActorSystem
import akka.stream.scaladsl._
import cats.effect.IO
import doobie.implicits._
import ciris._
import pureconfig._
import zio._
import sttp.client3._

// 测试选中这些标识符来检测库
object Main extends App {
  // Akka
  implicit val system: ActorSystem = ActorSystem("MySystem")
  val source = Source(1 to 100)
  source.runForeach(println)
  
  // Cats Effect
  val io = IO(println("Hello from Cats!"))
  io.unsafeRunSync()
  
  // ZIO
  val program: Task[Int] = for {
    _ <- Console.printLine("Hello, World!")
    n <- Random.nextIntBounded(100)
    _ <- Console.printLine(s"Random number: $n")
  } yield n
  
  val runtime = Runtime.default
  Unsafe.unsafe { implicit unsafe =>
    runtime.unsafe.run(program)
  }
  
  // Doobie
  val xa = Transactor.fromDriverManager[IO](
    "org.postgresql.Driver",
    "jdbc:postgresql:example",
    "user",
    "pass"
  )
  
  // sttp
  val backend = HttpURLConnectionBackend()
  val response = basicRequest.get(uri"https://api.example.com").send(backend)
  
  // PureConfig
  case class Config(port: Int, host: String)
  val config = ConfigSource.default.loadOrThrow[Config]
}