export function Network({ wide = false }: { wide?: boolean }) {
  const xs = [30, 120, 210, 300, 390]; const ys = [[50, 110, 170], [30, 80, 130, 180], [50, 110, 170], [30, 80, 130, 180], [80, 140]]
  const lines: JSX.Element[] = []; const dots: JSX.Element[] = []
  xs.forEach((x, i) => ys[i].forEach((y, j) => {
    dots.push(<circle key={`${i}-${j}`} cx={x} cy={y} r={i === 4 ? 9 : 6} fill={i === 4 ? '#e8c36a' : '#7fd0ff'} />)
    if (i < 4) ys[i + 1].forEach((y2, k) => lines.push(<line key={`${i}-${j}-${k}`} x1={x} y1={y} x2={xs[i + 1]} y2={y2} stroke="#2f7bff" strokeWidth="1" opacity=".45" />))
  }))
  return <svg viewBox="0 0 420 210" role="img" aria-label="Neural network" className={wide ? 'net-art' : 'tile-art'}>{lines}{dots}</svg>
}
