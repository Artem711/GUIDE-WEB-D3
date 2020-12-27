const renderGraph = async () => {
  let data = await d3.json("./data.json")

  // 1) Declare accessors
  const parseDate = d3.timeParse("%Y-%m-%d")
  const xAccessor = (d) => parseDate(d.date)
  const yAccessor = (d) => d.temperatureMax
  data = data.sort((a, b) => xAccessor(a) - xAccessor(b)).slice(0, 140)

  // 2) Dimensions
  const dimensions = {
    width: window.innerWidth * 0.9,
    height: 400,
    margins: { top: 15, right: 15, bottom: 40, left: 60 },
    boundedWidth: 0,
    boundedHeight: 0,
  }

  dimensions.boundedWidth =
    dimensions.width - dimensions.margins.right - dimensions.margins.left
  dimensions.boundedHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom

  // 3) Draw canvas
  const svg = d3
    .select("#wrapper")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)

  const bounds = svg
    .append("g")
    .style(
      "transform",
      `translate(${dimensions.margins.left}px, ${dimensions.margins.top}px)`
    )

  bounds
    .append("defs")
    .append("clipPath")
    .attr("id", "bounds-clip-path")
    .append("rect")
    .attr("width", dimensions.boundedWidth)
    .attr("height", dimensions.boundedHeight)

  // Init static elements
  const pathID = "path"
  const xAxisID = "xAxis"
  const yAxisID = "yAxis"
  const clip = bounds.append("g").attr("clip-path", `url(#bounds-clip-path)`)
  clip.append("path").attr("id", pathID)
  bounds.append("g").attr("id", yAxisID)
  bounds
    .append("g")
    .attr("id", xAxisID)
    .style("transform", `translateY(${dimensions.boundedHeight}px)`)

  const drawLine = (data) => {
    // 4) Declasre scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, xAccessor))
      .range([0, dimensions.boundedWidth])

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(data, yAccessor))
      .range([dimensions.boundedHeight, 0])

    // 5) Draw data
    const lineGenerator = d3
      .line()
      .x((d) => xScale(xAccessor(d)))
      .y((d) => yScale(yAccessor(d)))

    const lastTwoPoints = data.slice(-2)
    const pixelsBtwLastPoints =
      xScale(xAccessor(lastTwoPoints[1])) - xScale(xAccessor(lastTwoPoints[0]))

    bounds
      .select(`#${pathID}`)
      .attr("d", lineGenerator(data))
      .attr("fill", "none")
      .attr("stroke", "orange")
      .attr("stroke-width", 3)
      .style("transform", `translateX(${pixelsBtwLastPoints}px)`)
      .transition()
      .style("transform", "none")

    // 6) Draw axis
    const yAxisGenerator = d3.axisLeft().scale(yScale)
    const xAxisGenerator = d3.axisBottom().scale(xScale)

    bounds.select(`#${yAxisID}`).call(yAxisGenerator)
    bounds.select(`#${xAxisID}`).call(xAxisGenerator)

    // 7) Setup interactions
    bounds
      .append("rect")
      .attr("class", "listener-rect")
      .attr("width", dimensions.boundedWidth)
      .attr("height", dimensions.boundedHeight)
      .on("mousemove", onMouseMove)
      .on("mouseleave", onMouseLeave)

    const tooltip = d3.select("#tooltip")
    const tooltipCircle = bounds
      .append("circle")
      .attr("id", "tooltip-circle")
      .attr("r", 5)

    function onMouseMove(event, d) {
      const mousePosition = d3.pointer(event)

      const date = xScale.invert(mousePosition[0])
      const distanceFromDate = (d) => Math.abs(xAccessor(d) - date)

      const closestIndex = d3.leastIndex(
        data,
        (a, b) => distanceFromDate(a) - distanceFromDate(b)
      )

      const formatDate = d3.timeFormat("%B %A %-d, %Y")
      const formatTemp = (d) => `${d3.format(".1f")(d)} F`
      const point = data[closestIndex]
      tooltip.select("#date").text(formatDate(xAccessor(point)))
      tooltip
        .select("#temp")
        .select("span")
        .text(formatTemp(yAccessor(point)))

      const x = xScale(xAccessor(point)) + dimensions.margins.left
      const y = yScale(yAccessor(point)) + dimensions.margins.top

      tooltip.style(
        "transform",
        `translate(calc(-50% + ${x}px), calc(-100% + ${y}px))`
      )

      tooltip.style("opacity", 1)

      tooltipCircle
        .attr("cx", xScale(xAccessor(point)))
        .attr("cy", yScale(yAccessor(point)))
        .style("opacity", 1)
    }

    function onMouseLeave(event, d) {
      tooltip.style("opacity", 0)
      tooltipCircle.remove()
    }
  }
  drawLine(data)

  setInterval(addNewDay, 1500)
  function addNewDay() {
    data = [...data.slice(1), generateNewPoint(data)]

    drawLine(data)
  }

  const generateNewPoint = (data) => {
    const lastDataPoint = data[data.length - 1]
    const nextDay = d3.timeDay.offset(xAccessor(lastDataPoint), 1)

    return {
      date: d3.timeFormat("%Y-%m-%d")(nextDay),
      temperatureMax: yAccessor(lastDataPoint) + (Math.random() * 6 - 3),
    }
  }
}

renderGraph()
