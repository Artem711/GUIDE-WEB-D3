const drawGraph = async () => {
  // 1) Access data
  const data = await d3.json("./data.json")

  const dateParser = d3.timeParse("%Y-%m-%d")
  const xAccessor = (d) => dateParser(d.date)
  const yAccessor = (d) => d.temperatureMax

  // 2) Declare dimensions
  const dimensions = {
    width: window.innerWidth * 0.9,
    height: 400,
    margin: { top: 15, bottom: 40, right: 15, left: 60 },
    boundedWidth: 0,
    boundedHeight: 0,
  }

  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom

  // 3) Declare canvas
  const wrapper = d3
    .select("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)

  const bounds = wrapper
    .append("g")
    .style(
      "transform",
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
    )

  // 4) Declare scales
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

  bounds.append("path").attr("d", lineGenerator(data)).attr("id", "line")

  // 6) Draw peripherals
  const xAxisGenerator = d3.axisBottom().scale(xScale)
  bounds
    .append("g")
    .call(xAxisGenerator)
    .style("transform", `translateY(${dimensions.boundedHeight}px)`)

  const yAxisGenerator = d3.axisLeft().scale(yScale)
  bounds.append("g").call(yAxisGenerator)

  // 7) Setup interactions
  const listeningRect = bounds
    .append("rect")
    .attr("id", "listening_rect")
    .attr("width", dimensions.boundedWidth)
    .attr("height", dimensions.boundedHeight)
    .on("mousemove", onMouseMove)
    .on("mouseleave", onMouseLeave)

  const tooltip = d3.select("#tooltip")

  const tooltipCircle = bounds
    .append("circle")
    .attr("id", "tooltip-circle")
    .attr("r", 5)

  function onMouseMove(event) {
    const mousePosition = d3.pointer(event)
    const dateHovered = xScale.invert(mousePosition[0])

    const distanceFromDate = (d) => Math.abs(xAccessor(d) - dateHovered)
    const closestIndex = d3.leastIndex(
      data,
      (a, b) => distanceFromDate(a) - distanceFromDate(b)
    )

    const point = data[closestIndex]
    const formatDate = d3.timeFormat("%B %A %-d, %Y")
    const formatTemp = (d) => `${d3.format(".1f")(d)} F`
    tooltip.select("#date").text(formatDate(xAccessor(point)))
    tooltip
      .select("#temp")
      .select("span")
      .text(formatTemp(yAccessor(point)))

    const x = xScale(xAccessor(point)) + dimensions.margin.left
    const y = yScale(yAccessor(point)) + dimensions.margin.top

    tooltip
      .style(
        "transform",
        `translate(calc(-50% + ${x}px), calc(-100% + ${y}px))`
      )
      .style("opacity", 1)

    tooltipCircle
      .attr("cx", xScale(xAccessor(point)))
      .attr("cy", yScale(yAccessor(point)))
      .style("opacity", 1)
  }
  function onMouseLeave(event) {
    tooltip.style("opacity", 0)
    tooltipCircle.style("opacity", 0)
  }
}

drawGraph()
