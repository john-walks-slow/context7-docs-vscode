// C# 示例
using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using MediatR;
using AutoMapper;
using Serilog;

// 测试选中这些标识符来检测库
namespace Example;

[ApiController]
[Route("[controller]")]
public class WeatherController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IMediator _mediator;
    
    public WeatherController(AppDbContext context, IMapper mapper, IMediator mediator)
    {
        _context = context;
        _mapper = mapper;
        _mediator = mediator;
    }
}

public class AppDbContext : DbContext
{
    public DbSet<User> Users => Set<User>();
}

// Serilog
Log.Information("Application started");

// Newtonsoft.Json
var json = JsonConvert.SerializeObject(new { name = "test" });