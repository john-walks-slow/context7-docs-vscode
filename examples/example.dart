// Dart 示例
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:get/get.dart';
import 'package:riverpod/riverpod.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

// 测试选中这些标识符来检测库
void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  
  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      home: Scaffold(
        appBar: AppBar(title: const Text('Example')),
        body: const Center(child: Text('Hello')),
      ),
    );
  }
}

// Dio
final dio = Dio();
final response = await dio.get('https://api.example.com');

// Riverpod
final counterProvider = StateProvider<int>((ref) => 0);

// GetX
Get.to(NextPage());
Get.snackbar('Title', 'Message');

// Freezed
@freezed
class User with _$User {
  const factory User({
    required String name,
    required int age,
  }) = _User;
}