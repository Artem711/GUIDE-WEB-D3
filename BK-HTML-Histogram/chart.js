async function drawBars() {
  // 1. Access data
  const dataset = await d3.json("./data.json")

  // 2. Create chart dimensions
  const width = 690
  let dimensions = {
    height: width * 0.6,
    width: width,
    margin: { top: 50, right: 10, bottom: 50, left: 50 },
    boundedHeight: 0,
    boundedWidth: 0,
  }

  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom

  // 3. Draw canvas
  const wrapper = d3
    .select("#wrapper")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)
    .style("font-family", "sans-serif")

  const bounds = wrapper
    .append("g")
    .style(
      "transform",
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
    )

  const drawHistogram = (metric) => {
    // Declare accessors
    const metricAccessor = (d) => d[metric]
    const yAccessor = (d) => d.length

    // 4. Create scales
    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(dataset, metricAccessor))
      .range([0, dimensions.boundedWidth])
      .nice()

    const binsGenerator = d3
      .histogram()
      .domain(xScale.domain())
      .value(metricAccessor)
      .thresholds(12)

    const bins = binsGenerator(dataset)

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(bins, yAccessor)])
      .range([dimensions.boundedHeight, 0])
      .nice()

    // 5. Draw data
    const updateTransition = d3
      .transition()
      .duration(1000)
      .delay(1000)
      .ease(d3.easeCubicInOut)

    const exitTransition = d3
      .transition()
      .duration(1000)
      .ease(d3.easeCubicInOut)

    const binID = "binID"
    const rectID = "rectID"
    const rectTextID = "rectTextID"

    let binGroups = bounds.selectAll(`#${binID}`).data(bins)

    const oldBinGroups = binGroups.exit()
    oldBinGroups
      .selectAll(`#${rectID}`)
      .style("fill", "red")
      .transition(exitTransition)
      .attr("height", 0)
      .attr("y", dimensions.boundedHeight)

    oldBinGroups
      .selectAll(`#${rectTextID}`)
      .transition(exitTransition)
      .attr("y", dimensions.boundedHeight)

    oldBinGroups.transition(exitTransition).remove()

    const newBinGroups = binGroups.enter().append("g").attr("id", binID)
    binGroups = newBinGroups.merge(binGroups)

    const padding = 1
    newBinGroups
      .append("rect")
      .attr("id", rectID)
      .attr("x", (d) => xScale(d.x0) + padding)
      .attr("y", dimensions.boundedHeight)
      .attr("width", (d) => d3.max([0, xScale(d.x1) - xScale(d.x0) - padding]))
      .attr("height", 0)
      .attr("fill", "yellowgreen")

    binGroups
      .select(`#${rectID}`)
      .transition(updateTransition)
      .attr("x", (d) => xScale(d.x0) + padding)
      .attr("y", (d) => yScale(yAccessor(d)))
      .attr("width", (d) => d3.max([0, xScale(d.x1) - xScale(d.x0) - padding]))
      .attr("height", (d) => dimensions.boundedHeight - yScale(yAccessor(d)))
      .transition()

    binGroups
      .append("text")
      .attr("id", rectTextID)
      .attr("x", (d) => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
      .attr("y", (d) => dimensions.boundedHeight)

    binGroups
      .filter(yAccessor)
      .select(`#${rectTextID}`)
      .transition(updateTransition)
      .attr("x", (d) => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
      .attr("y", (d) => yScale(yAccessor(d) + 2))
      .text(yAccessor)
      .style("text-anchor", "middle")
      .style("fill", "#666")
      .style("font-size", "14px")

    const mean = d3.mean(dataset, metricAccessor)

    const meanID = "mean"
    bounds.append("line").attr("id", meanID)
    bounds
      .select(`#${meanID}`)
      .transition(updateTransition)
      .attr("x1", xScale(mean))
      .attr("x2", xScale(mean))
      .attr("y1", -15)
      .attr("y2", dimensions.boundedHeight)
      .attr("stroke", "maroon")
      .style("stroke-dasharray", "20px 10px")

    const meanTextID = "mean-text"
    bounds.append("text").attr("id", meanTextID)
    bounds
      .select(`#${meanTextID}`)
      .transition(updateTransition)
      .attr("x", xScale(mean))
      .attr("y", -25)
      .text("Mean")
      .style("text-anchor", "middle")
      .style("stroke", "maroon")
      .style("font-size", "13px")

    // 6. Draw peripherals
    const xAxisID = "xAxis"
    bounds
      .append("g")
      .attr("id", xAxisID)
      .style("transform", `translateY(${dimensions.boundedHeight}px)`)

    const xAxisGenerator = d3.axisBottom().scale(xScale)
    bounds.select(`#${xAxisID}`).transition().call(xAxisGenerator)

    const labelID = "xAxis-label"
    bounds.append("text").attr("id", labelID)
    bounds
      .select(`#${labelID}`)
      .attr("x", dimensions.boundedWidth / 2)
      .attr("y", dimensions.boundedHeight + 42)
      .text(metric)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .style("font-size", "1em")

    // 7) Create interactions
    const tooltip = d3.select("#tooltip")

    binGroups.on("mouseenter", onMouseEnter).on("mouseleave", onMouseLeave)
    function onMouseEnter(event, d) {
      tooltip.style("opacity", 1)
      tooltip.select("#range").text([d.x0, d.x1].join(" - "))
      tooltip.select("#count").text(d.length)

      const x =
        xScale(d.x0) +
        padding / 2 +
        (xScale(d.x1) - xScale(d.x0)) / 2 +
        dimensions.margin.left

      const y = yScale(yAccessor(d)) + dimensions.margin.top

      tooltip.style(
        "transform",
        `translate(calc(-50% + ${x}px), calc(-100% + ${y}px))`
      )
    }
    function onMouseLeave(event, d) {
      tooltip.style("opacity", 0)
    }
  }

  const metrics = [
    "windSpeed",
    "moonPhase",
    "dewPoint",
    "humidity",
    "uvIndex",
    "windBearing",
    "temperatureMin",
    "temperatureMax",
  ]

  let selectedMetricIndex = 0
  drawHistogram(metrics[selectedMetricIndex])

  const button = d3.select("body").append("button").text("Change metric")
  button.node().addEventListener("click", onClick)
  function onClick() {
    selectedMetricIndex = (selectedMetricIndex + 1) % metrics.length
    drawHistogram(metrics[selectedMetricIndex])
  }
}
drawBars()
