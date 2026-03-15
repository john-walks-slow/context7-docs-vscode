const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

async function convertSvgToPng(inputPath, outputPath) {
  try {
    const svgBuffer = fs.readFileSync(inputPath)

    await sharp(svgBuffer).resize(128, 128).png().toFile(outputPath)

    console.log(
      `✅ Converted: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`,
    )
  } catch (error) {
    console.error(`❌ Error converting ${inputPath}:`, error.message)
    process.exit(1)
  }
}

const inputFile = process.argv[2] || 'resources/icon-dark.svg'
const outputFile = process.argv[3] || 'resources/icon.png'

convertSvgToPng(inputFile, outputFile)
