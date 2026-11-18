// crop.swift <in.png> <out.png> <width> <maxHeight|0> [trim]
// Keeps the top-left <width> × <maxHeight> of a PNG (0 = full height). „trim” cuts the empty (near-white) rows at the
// bottom (min height 812 / 900 kept by the caller via maxHeight floor). Used by shots.mjs (sips can't crop from 0,0).
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
guard a.count >= 5, let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("usage / read error"); exit(1) }
let w = min(img.width, Int(a[3])!)
var h = Int(a[4])! > 0 ? min(img.height, Int(a[4])!) : img.height
let trim = a.count > 5 && a[5] == "trim"
let minH = a.count > 6 ? Int(a[6])! : 0
if trim {
  let cs = CGColorSpaceCreateDeviceRGB()
  var buf = [UInt8](repeating: 0, count: w * img.height * 4)
  let ctx = CGContext(data: &buf, width: w, height: img.height, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: img.width, height: img.height))
  var last = 0
  for y in 0..<img.height { // buf row 0 = top
    var row = false
    for x in stride(from: 0, to: w, by: 2) { let i = (y * w + x) * 4; if buf[i] < 235 || buf[i + 1] < 235 || buf[i + 2] < 235 { row = true; break } }
    if row { last = y }
  }
  h = min(h, max(minH, last + 48))
}
guard let out = img.cropping(to: CGRect(x: 0, y: 0, width: w, height: h)),
      let dst = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, UTType.png.identifier as CFString, 1, nil) else { exit(1) }
CGImageDestinationAddImage(dst, out, nil); CGImageDestinationFinalize(dst)
print("\(w)x\(h) from \(img.width)x\(img.height)")
